import type { Mission, Place, Role } from '../types'
import draftsJson from './generated/drafts.json'
import rolesJson from './generated/roles.json'

/**
 * Explore-mode roles with their approved missions, exported from Data/sheets/roles.csv,
 * missions.csv and role_templates.csv by Data/scripts/export_app.mjs. Edit the sheets, then re-run
 * the export.
 *
 * While developing locally (`npm run dev`), roles and missions still marked draft are shown too
 * (badged "Draft") so they can be reviewed in the app; production builds only ever see approved rows.
 */
// Shape is checked by export_app.mjs, so the casts are safe.
const APPROVED = rolesJson as unknown as Role[]
const DRAFTS = import.meta.env.DEV ? ((draftsJson as unknown as { roles: Role[] }).roles ?? []) : []

export const ROLES: Role[] = [
  ...APPROVED.map((r) => DRAFTS.find((d) => d.id === r.id) ?? r),
  ...DRAFTS.filter((d) => !APPROVED.some((r) => r.id === d.id)),
]

export function getRole(id: string | null | undefined): Role | null {
  return ROLES.find((r) => r.id === id) ?? null
}

const fill = (m: Mission, place: Place): Mission => ({
  task: { vi: m.task.vi.replaceAll('{place}', place.name.vi), en: m.task.en.replaceAll('{place}', place.name.en) },
  item: m.item,
})

/** Small stable hash, so a stop always gets the same variant (on every page, every visit). */
function hash(s: string): number {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

/**
 * This role's task at a stop: its own mission for the place, else one of its templates for that
 * kind of stop (events have their own) — preferring templates tagged with one of the place's
 * themes/tags, and varying from place to place — else its general fallback.
 */
export function missionFor(role: Role, place: Place): Mission {
  const own = place.event ? undefined : role.missions[place.id]
  if (own) return own
  const kind = place.event ? 'event' : place.kind
  const ofKind = role.templates.filter((t) => t.kind === kind)
  const traits: string[] = [...place.themes, ...place.tags]
  const tagged = ofKind.filter((t) => t.tag && traits.includes(t.tag))
  const pool = tagged.length ? [...tagged, ...ofKind.filter((t) => !t.tag)] : ofKind.filter((t) => !t.tag)
  const list = pool.length ? pool : ofKind
  if (!list.length) return role.fallback
  return fill(list[hash(role.id + place.id) % list.length], place)
}
