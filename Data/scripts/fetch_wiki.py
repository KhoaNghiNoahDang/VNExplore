"""
Download Wikipedia text (vi + en) for the places we will draft content for.
It is research material only — drafts must be re-written, never copied (CC BY-SA).

Output: Data/out/wiki/<wikidata>.md
Run:    python Data/scripts/fetch_wiki.py Q5370414 Q1186043 ...
        (no arguments → every row in skeleton.csv that has a Wikipedia link)
"""

from __future__ import annotations

import csv
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "out" / "wiki"
OUT.mkdir(parents=True, exist_ok=True)
UA = "VNExplore-data/0.1 (prototype)"
MAX_CHARS = 6000


def extract(lang: str, title: str) -> str:
    q = urllib.parse.urlencode({
        "action": "query", "prop": "extracts", "explaintext": 1, "redirects": 1,
        "titles": title, "format": "json",
    })
    req = urllib.request.Request(f"https://{lang}.wikipedia.org/w/api.php?{q}", headers={"User-Agent": UA})
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                pages = json.loads(r.read().decode("utf-8"))["query"]["pages"]
            break
        except urllib.error.HTTPError as e:
            if e.code != 429 or attempt == 3:
                raise
            time.sleep(10 * (attempt + 1))  # rate-limited: back off and retry
    text = next(iter(pages.values())).get("extract", "")
    return text[:MAX_CHARS]


def main() -> None:
    wanted = set(sys.argv[1:])
    rows = list(csv.DictReader((ROOT / "out" / "skeleton.csv").open(encoding="utf-8-sig")))
    for r in rows:
        if wanted and r["wikidata"] not in wanted:
            continue
        if not (r["wikipedia_vi"] or r["wikipedia_en"]):
            continue
        if (OUT / f"{r['wikidata']}.md").exists():
            continue  # already downloaded
        parts = [f"# {r['name_vi']} / {r['name_en']}", f"wikidata: {r['wikidata']}", ""]
        for lang, key in (("vi", "wikipedia_vi"), ("en", "wikipedia_en")):
            if r[key]:
                parts += [f"## {lang}.wikipedia.org/wiki/{r[key].replace(' ', '_')}", extract(lang, r[key]), ""]
                time.sleep(1.5)
        (OUT / f"{r['wikidata']}.md").write_text("\n".join(parts), encoding="utf-8")
        print(f"  {r['wikidata']}  {r['name_vi']}")


if __name__ == "__main__":
    main()
