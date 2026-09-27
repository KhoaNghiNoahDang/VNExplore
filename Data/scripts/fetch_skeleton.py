"""
Build the place "skeleton" (candidates) for VNExplore from open data.

For each area:
  1. OpenStreetMap (Overpass API) → names, coordinates, type, address, opening hours
  2. Wikidata                      → Wikipedia links, inception year, Commons image
  3. Sensitivity filter            → drop restricted sites, flag ones that need careful review
  4. De-duplicate + rank

Output:
  Data/out/skeleton.csv        every kept place, all areas
  Data/out/excluded.csv        what the filter dropped, and why (for auditing)
  Data/sheets/candidates.csv   kept places that are not already in sheets/places.csv

Licences: OSM © OpenStreetMap contributors (ODbL). Wikidata is CC0.
Standard library only:  python Data/scripts/fetch_skeleton.py [area ...]
"""

from __future__ import annotations

import csv
import io
import json
import math
import re
import time
import unicodedata
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out"
SHEETS = ROOT / "sheets"
OUT.mkdir(exist_ok=True)

UA = "VNExplore-data/0.2 (prototype)"

# Overpass area filters. "around" = radius in metres around a point; "bbox" = (south, west, north, east).
AREAS = {
    "hoan-kiem": {"label": "Quanh Hồ Gươm", "center": (21.0288, 105.8525), "around": 2500},
    # Ba Vì mountain + Sơn Tây next door (Thành cổ Sơn Tây, Đường Lâm area).
    "ba-vi": {"label": "Ba Vì", "center": (21.0800, 105.3700), "bbox": (20.9500, 105.2300, 21.2600, 105.5200)},
}

OVERPASS_HOSTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
]

# ------------------------------------------------------------------ sensitivity rules
# Level 1 — never included (restricted, private or security sites).
EXCLUDE_TAGS = [
    ("military", None), ("landuse", "military"), ("office", "government"), ("office", "diplomatic"),
    ("amenity", "police"), ("amenity", "prison"), ("amenity", "courthouse"), ("amenity", "embassy"),
    ("government", None), ("amenity", "casino"), ("amenity", "stripclub"), ("amenity", "brothel"),
    ("amenity", "love_hotel"), ("shop", "adult"),
]
EXCLUDE_NAME = re.compile(
    r"bộ tư lệnh|quân khu|doanh trại|sư đoàn|trung đoàn|lữ đoàn|ban chỉ huy quân sự|đại sứ quán|"
    r"trụ sở|ủy ban nhân dân|ubnd|văn phòng chính phủ|embassy|military|barracks",
    re.I,
)
# Level 2 — kept but flagged "review": death, war, national leaders, politically sensitive history.
REVIEW_TAGS = [
    ("amenity", "grave_yard"), ("landuse", "cemetery"), ("historic", "tomb"),
    ("historic", "battlefield"), ("memorial", "war_memorial"),
    # Not freely open (private house, restricted relic): keep, but a person must check access.
    ("access", "private"), ("access", "no"),
]
# Statues and monuments are fine unless the name points to war, death or national leaders.
REVIEW_NAME = re.compile(
    r"liệt s[ĩỹ]|nghĩa trang|nghĩa địa|lăng (chủ tịch|bác)|tưởng niệm|hồ chí minh|bác hồ|chủ tịch|"
    r"tổng bí thư|đại tướng|cảm tử|quyết tử|chiến thắng|chiến khu|k9|đá chông|căn cứ|kháng chiến|"
    r"công an|trại giam|nhà tù|bảo tàng quân|tổ quốc ghi công",
    re.I,
)

# ------------------------------------------------------------------ helpers
def http_json(url: str, data: bytes | None = None, timeout: int = 180) -> dict:
    req = urllib.request.Request(url, data=data, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode("utf-8"))


def overpass(query: str) -> dict:
    body = urllib.parse.urlencode({"data": query}).encode()
    last: Exception | None = None
    for host in OVERPASS_HOSTS:
        for attempt in range(2):
            try:
                print(f"    Overpass {host} (try {attempt + 1})")
                return http_json(host, body)
            except Exception as e:
                last = e
                print(f"      failed: {e}")
                time.sleep(8)
    raise RuntimeError(f"All Overpass mirrors failed: {last}")


def slug(text: str) -> str:
    text = text.replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:56]


def dist_m(a: tuple[float, float], b: tuple[float, float]) -> float:
    la1, lo1, la2, lo2 = map(math.radians, (*a, *b))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


def has_tag(t: dict, k: str, v: str | None) -> bool:
    return k in t and (v is None or t[k] == v)


FOOD_CAT = {"restaurant": "restaurant", "cafe": "cafe", "fast_food": "street_food", "food_court": "street_food",
            "ice_cream": "cafe", "bar": "bar", "pub": "bar", "biergarten": "bar"}
FUN_CAT = {"pitch": "sport", "sports_centre": "sport", "stadium": "sport", "fitness_centre": "sport", "golf_course": "sport",
           "swimming_pool": "pool", "cinema": "cinema", "karaoke_box": "karaoke", "nightclub": "nightlife"}


def category(t: dict) -> str:
    if t.get("amenity") in FOOD_CAT:
        return FOOD_CAT[t["amenity"]]
    if t.get("amenity") in FUN_CAT:
        return FUN_CAT[t["amenity"]]
    if t.get("leisure") in FUN_CAT:
        return FUN_CAT[t["leisure"]]
    if t.get("leisure") in ("bowling_alley", "amusement_arcade", "escape_game", "trampoline_park", "miniature_golf", "ice_rink", "dance"):
        return "entertainment"
    if t.get("tourism") == "museum":
        return "museum"
    if t.get("amenity") == "place_of_worship":
        return "religious"
    if t.get("natural") in ("peak", "waterfall", "cave_entrance", "spring", "hot_spring") or t.get("leisure") == "nature_reserve" or t.get("boundary") in ("national_park", "protected_area"):
        return "nature"
    if t.get("natural") == "water":
        return "lake"
    if t.get("leisure") == "resort":
        return "resort"
    if t.get("leisure") in ("park", "garden"):
        return "park"
    if t.get("tourism") in ("camp_site", "picnic_site"):
        return "camp"
    if t.get("amenity") == "marketplace":
        return "market"
    if t.get("amenity") in ("theatre", "arts_centre") or t.get("tourism") == "gallery":
        return "arts"
    if t.get("historic"):
        return "relic"
    if t.get("tourism") == "viewpoint":
        return "viewpoint"
    return "attraction"


def osm_kind(t: dict) -> str:
    for k in ("tourism", "historic", "amenity", "leisure", "natural", "boundary"):
        if k in t:
            return f"{k}={t[k]}"
    return ""


# ------------------------------------------------------------------ 1. OSM
# One Overpass query per group keeps each request small (the public servers time out on big ones).
QUERIES = {
    "sight": """
  nwr["tourism"~"^(attraction|museum|gallery|viewpoint|zoo|theme_park|aquarium|picnic_site|camp_site|artwork)$"]["name"]{f};
  nwr["historic"]["name"]{f};
  nwr["leisure"~"^(park|garden|nature_reserve|water_park)$"]["name"]{f};
  nwr["boundary"~"^(national_park|protected_area)$"]["name"]{f};
  nwr["amenity"="place_of_worship"]["name"]{f};
  nwr["amenity"~"^(theatre|arts_centre|marketplace)$"]["name"]{f};
  nwr["natural"~"^(peak|waterfall|cave_entrance|spring|hot_spring)$"]["name"]{f};
  nwr["natural"="water"]["water"~"^(lake|reservoir|pond)$"]["name"]{f};
  nwr["leisure"="resort"]["name"]{f};""",
    "food": """
  nwr["amenity"~"^(restaurant|cafe|fast_food|food_court|ice_cream|bar|pub|biergarten)$"]["name"]{f};""",
    "fun": """
  nwr["leisure"~"^(pitch|sports_centre|swimming_pool|stadium|bowling_alley|amusement_arcade|escape_game|trampoline_park|golf_course|miniature_golf|ice_rink|fitness_centre|dance)$"]["name"]{f};
  nwr["amenity"~"^(cinema|karaoke_box|nightclub)$"]["name"]{f};""",
}


def fetch_area(key: str, cfg: dict) -> list[dict]:
    if "around" in cfg:
        lat, lng = cfg["center"]
        f = f"(around:{cfg['around']},{lat},{lng})"
    else:
        s, w, n, e = cfg["bbox"]
        f = f"({s},{w},{n},{e})"
    places, seen = [], set()
    for group, body in QUERIES.items():
        data = overpass("[out:json][timeout:170];(" + body.replace("{f}", f) + ");out tags center;")
        (OUT / f"osm_raw_{key}_{group}.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        n = 0
        for el in data["elements"]:
            t = el.get("tags", {})
            lat = el.get("lat") or el.get("center", {}).get("lat")
            lon = el.get("lon") or el.get("center", {}).get("lon")
            if lat and t.get("name") and (el["type"], el["id"]) not in seen:
                seen.add((el["type"], el["id"]))
                places.append({"area": key, "group": group, "osm_type": el["type"], "osm_id": el["id"],
                               "lat": lat, "lng": lon, "tags": t})
                n += 1
        print(f"    {group}: {n}")
        time.sleep(3)
    return places


# ------------------------------------------------------------------ 2. Wikidata
def fetch_wikidata(qids: list[str]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for i in range(0, len(qids), 40):
        url = (
            "https://www.wikidata.org/w/api.php?action=wbgetentities&format=json"
            "&props=labels|claims|sitelinks&languages=vi|en&ids=" + "|".join(qids[i : i + 40])
        )
        out.update(http_json(url).get("entities", {}))
        time.sleep(1)
    return out


def claim(entity: dict, prop: str):
    try:
        return entity["claims"][prop][0]["mainsnak"]["datavalue"]["value"]
    except (KeyError, IndexError):
        return None


# ------------------------------------------------------------------ 3. filter + rank
def sensitivity(t: dict) -> tuple[str, str]:
    name = t.get("name", "")
    for k, v in EXCLUDE_TAGS:
        if has_tag(t, k, v):
            return "exclude", f"{k}={t[k]}"
    if EXCLUDE_NAME.search(name):
        return "exclude", "name: " + EXCLUDE_NAME.search(name).group(0)
    for k, v in REVIEW_TAGS:
        if has_tag(t, k, v):
            return "review", f"{k}={t[k]}"
    if REVIEW_NAME.search(name):
        return "review", "name: " + REVIEW_NAME.search(name).group(0)
    if t.get("amenity") == "place_of_worship":
        return "religious", "active place of worship"
    if t.get("amenity") in ("bar", "pub", "biergarten", "nightclub"):
        return "adult", "alcohol / 18+"
    return "ok", ""


def score(p: dict, center: tuple[float, float], radius: float) -> float:
    t = p["tags"]
    s = 0.0
    s += 3 if t.get("wikidata") else 0
    s += 2 if t.get("wikipedia") else 0
    s += 2 if t.get("name:en") else 0
    s += 2 if t.get("tourism") in ("attraction", "museum", "zoo", "theme_park") else 0
    s += 1.5 if t.get("boundary") == "national_park" or t.get("natural") in ("waterfall", "peak", "water") else 0
    s += 1 if t.get("historic") else 0
    s += 1 if t.get("opening_hours") or t.get("website") else 0
    s -= 1 if t.get("tourism") == "artwork" else 0
    s += 1 if t.get("cuisine") == "vietnamese" else 0
    s -= 1.5 if t.get("brand") else 0  # chains are less interesting than local spots
    s += 0.5 if t.get("phone") or t.get("contact:phone") else 0
    s -= 2 * dist_m(center, (p["lat"], p["lng"])) / radius  # closer to the heart of the area first
    return round(s, 2)


def dedupe(places: list[dict]) -> list[dict]:
    """Same name within 300 m = same place (a temple can be a node and a building)."""
    kept: list[dict] = []
    for p in sorted(places, key=lambda x: -x["score"]):
        key = slug(p["tags"]["name"])
        if any(slug(k["tags"]["name"]) == key and dist_m((k["lat"], k["lng"]), (p["lat"], p["lng"])) < 300 for k in kept):
            continue
        kept.append(p)
    return kept


def existing_places() -> tuple[set[str], list[tuple[str, float, float]]]:
    """Places already in sheets/places.csv (by wikidata and by name + position)."""
    path = SHEETS / "places.csv"
    if not path.exists():
        return set(), []
    rows = list(csv.DictReader(io.StringIO(path.read_text(encoding="utf-8-sig"))))
    qids = {r["wikidata"] for r in rows if r.get("wikidata")}
    named = []
    for r in rows:
        for n in (r["name_vi"], r["name_vi_short"]):
            named.append((slug(n), float(r["lat"]), float(r["lng"])))
    return qids, named


def main(only: list[str]) -> None:
    all_kept: list[dict] = []
    excluded: list[dict] = []
    for key, cfg in AREAS.items():
        if only and key not in only:
            continue
        print(f"== {cfg['label']} ({key})")
        raw = fetch_area(key, cfg)
        print(f"   {len(raw)} named features from OSM")
        radius = cfg.get("around") or dist_m(cfg["bbox"][:2], cfg["bbox"][2:]) / 2
        area_kept = []
        for p in raw:
            level, why = sensitivity(p["tags"])
            if level == "exclude":
                excluded.append({"area": key, "name": p["tags"]["name"], "reason": why,
                                 "osm_url": f"https://www.openstreetmap.org/{p['osm_type']}/{p['osm_id']}"})
                continue
            p["sensitivity"], p["sensitivity_reason"] = level, why
            p["score"] = score(p, cfg["center"], radius)
            area_kept.append(p)
        area_kept = dedupe(area_kept)
        print(f"   kept {len(area_kept)} (excluded so far: {len(excluded)})")
        all_kept += area_kept
        time.sleep(3)

    print("== Wikidata")
    qids = sorted({p["tags"]["wikidata"] for p in all_kept if p["tags"].get("wikidata")})
    wd = fetch_wikidata(qids) if qids else {}
    print(f"   {len(wd)} items")

    cols = [
        "id", "area", "group", "status", "sensitivity", "sensitivity_reason", "category", "cuisine", "brand",
        "name_vi", "name_en",
        "lat", "lng", "osm_kind", "address", "opening_hours", "website", "wikidata", "wikipedia_vi",
        "wikipedia_en", "inception", "commons_image", "osm_url", "score", "decision",
    ]
    rows, seen_ids = [], set()
    group_order = {"sight": 0, "food": 1, "fun": 2}
    for p in sorted(all_kept, key=lambda x: (x["area"], group_order[x["group"]], -x["score"])):
        t = p["tags"]
        e = wd.get(t.get("wikidata", ""), {})
        sl = e.get("sitelinks", {})
        inc = claim(e, "P571")
        # name:en can be in a non-Latin script (Thai, Chinese…) that slugs to "" → fall back.
        pid = slug(t.get("name:en", "")) or slug(t["name"]) or f"osm-{p['osm_type']}-{p['osm_id']}"
        while pid in seen_ids:  # same name in two places → make ids unique
            pid += "-" + str(p["osm_id"])[-4:]
        seen_ids.add(pid)
        rows.append({
            "id": pid, "area": p["area"], "group": p["group"], "status": "candidate",
            "cuisine": t.get("cuisine", "").replace(";", ", "), "brand": t.get("brand", ""),
            "sensitivity": p["sensitivity"], "sensitivity_reason": p["sensitivity_reason"],
            "category": category(t), "name_vi": t["name"],
            "name_en": t.get("name:en") or e.get("labels", {}).get("en", {}).get("value", ""),
            "lat": round(p["lat"], 6), "lng": round(p["lng"], 6), "osm_kind": osm_kind(t),
            "address": " ".join(x for x in (t.get("addr:housenumber"), t.get("addr:street")) if x),
            "opening_hours": t.get("opening_hours", ""), "website": t.get("website", ""),
            "wikidata": t.get("wikidata", ""),
            "wikipedia_vi": sl.get("viwiki", {}).get("title", ""), "wikipedia_en": sl.get("enwiki", {}).get("title", ""),
            "inception": inc["time"][1:5] if isinstance(inc, dict) and "time" in inc else "",
            "commons_image": claim(e, "P18") or "",
            "osm_url": f"https://www.openstreetmap.org/{p['osm_type']}/{p['osm_id']}",
            "score": p["score"], "decision": "",
        })

    def write(path: Path, fields: list[str], data: list[dict]) -> None:
        with path.open("w", newline="", encoding="utf-8-sig") as f:
            w = csv.DictWriter(f, fieldnames=fields, lineterminator="\r\n")
            w.writeheader()
            w.writerows(data)
        print(f"   → {path.relative_to(ROOT)} ({len(data)} rows)")

    print("== Writing")
    write(OUT / "skeleton.csv", cols, rows)
    write(OUT / "excluded.csv", ["area", "name", "reason", "osm_url"], excluded)

    have_q, have_named = existing_places()
    fresh = [
        r for r in rows
        if r["wikidata"] not in have_q
        and not any(s == slug(r["name_vi"]) and dist_m((la, lo), (r["lat"], r["lng"])) < 400 for s, la, lo in have_named)
    ]
    write(SHEETS / "candidates.csv", cols, fresh)


if __name__ == "__main__":
    import sys

    main(sys.argv[1:])
