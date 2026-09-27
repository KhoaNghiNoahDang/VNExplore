import type { Role } from '../types'
import rolesJson from './generated/roles.json'

/**
 * Explore-mode roles with their approved missions, exported from Data/sheets/roles.csv
 * and missions.csv by Data/scripts/export_app.mjs. Edit the sheets, then re-run the export.
 */
// Shape is checked by export_app.mjs, so the cast is safe.
export const ROLES = rolesJson as unknown as Role[]

export function getRole(id: string | null | undefined): Role | null {
  return ROLES.find((r) => r.id === id) ?? null
}

export function missionFor(role: Role, placeId: string) {
  return role.missions[placeId] ?? role.fallback
}
