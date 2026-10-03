import type { Place, Role } from '../types'

export interface RoleFit {
  role: Role
  score: number
  /** Stops the role really fits (its own mission, a favourite, or a matching tag). */
  fits: number
}

/** Does this tag describe the stop? Tags are themes, kinds of stop, event categories or "event". */
function tagMatches(tag: string, stop: Place): boolean {
  if (tag === 'event') return !!stop.event
  if (stop.event && stop.event.category === tag) return true
  return stop.kind === tag || stop.themes.includes(tag as Place['themes'][number])
}

/**
 * How well a role suits a route. Per stop: its own written mission counts most, then the role's
 * favourite places, then matching tags (at most two). Roles written for the other area (Ba Vì
 * roles on an Old Quarter route) drop to the bottom.
 */
export function roleFit(role: Role, stops: Place[]): RoleFit {
  let score = 0
  let fits = 0
  for (const s of stops) {
    let pts = 0
    if (!s.event && role.missions[s.id]) pts += 4
    else if (role.favPlaces.includes(s.id)) pts += 3
    pts += Math.min(2, role.tags.filter((t) => tagMatches(t, s)).length)
    if (role.area !== 'any' && role.area !== s.area) pts -= 4
    if (pts >= 2) fits++
    score += pts
  }
  return { role, score, fits }
}

/** Every role, best fit for these stops first (ties keep the sheet's order). */
export function rankRoles(roles: Role[], stops: Place[]): RoleFit[] {
  return roles
    .map((r, i) => ({ ...roleFit(r, stops), i }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map(({ i: _i, ...fit }) => fit)
}
