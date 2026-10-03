import { PLACES } from '../data/places'
import type { Place, PlaceTag, Theme } from '../types'
import { supabase } from './supabase'

/** A row of public.places (flat, one column per language). */
type PlaceRow = Record<string, string | number | string[] | null>

const L = (r: PlaceRow, base: string) => ({ vi: String(r[`${base}_vi`] ?? ''), en: String(r[`${base}_en`] ?? '') })

function toPlace(r: PlaceRow): Place {
  return {
    id: String(r.id),
    area: (r.area as Place['area']) ?? 'hoan-kiem',
    kind: (r.kind as Place['kind']) ?? 'sight',
    depth: (r.depth as Place['depth']) ?? 'full',
    openingHours: (r.opening_hours as string | null) ?? null,
    priceCheckedOn: (r.price_checked_on as string | null) ?? null,
    name: L(r, 'name'),
    nameVi: String(r.name_vi_short ?? r.name_vi),
    lat: Number(r.lat),
    lng: Number(r.lng),
    priceMin: Number(r.price_min_k),
    priceMax: Number(r.price_max_k),
    visitMin: Number(r.visit_min),
    themes: (r.themes as Theme[]) ?? [],
    tags: (r.tags as PlaceTag[]) ?? [],
    blurb: L(r, 'blurb'),
    tone: (r.tone as Place['tone']) ?? 'teal',
    story: L(r, 'story'),
    why: L(r, 'why'),
    photoTip: L(r, 'photo_tip'),
    etiquette: L(r, 'etiquette'),
    challenge: !r.challenge_vi ? null : {
      prompt: L(r, 'challenge'),
      options: [L(r, 'option1'), L(r, 'option2'), L(r, 'option3')],
      answer: Math.max(0, Number(r.answer ?? 1) - 1),
      hint: L(r, 'hint'),
    },
  }
}

/**
 * Approved places from Supabase; the bundled copy (exported from the same sheets)
 * is used when Supabase isn't configured or can't be reached.
 */
export async function fetchPlaces(): Promise<Place[]> {
  if (!supabase) return PLACES
  try {
    const { data, error } = await supabase.from('places').select('*').eq('status', 'approved')
    if (error) throw error
    if (!data?.length) return PLACES

    // Deployments can temporarily have an older Supabase seed than the bundled
    // catalogue. Preserve the bundled editorial copy while still accepting
    // remote operational fields such as coordinates, prices and opening hours.
    const merged = new Map(PLACES.map((place) => [place.id, place]))
    for (const row of data as PlaceRow[]) {
      const remote = toPlace(row)
      const bundled = merged.get(remote.id)
      merged.set(
        remote.id,
        bundled
          ? {
              ...bundled,
              ...remote,
              name: bundled.name,
              nameVi: bundled.nameVi,
              blurb: bundled.blurb,
              story: bundled.story,
              why: bundled.why,
              photoTip: bundled.photoTip,
              etiquette: bundled.etiquette,
              challenge: bundled.challenge ?? remote.challenge,
            }
          : remote,
      )
    }
    return [...merged.values()]
  } catch (err) {
    console.warn('Supabase unavailable, using bundled places:', err)
    return PLACES
  }
}
