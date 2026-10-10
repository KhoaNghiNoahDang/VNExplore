import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * App content (approved places with their quizzes, roles + missions, events), read from
 * Backend/content/content.json — written by `node Data/scripts/export_app.mjs` from Data/sheets,
 * the same export as the app's bundled copy. No database involved: a deploy ships the file.
 */
export interface Content {
  version: string
  loadedAt: string
  places: { id: string }[]
  roles: { id: string }[]
  events: { id: string }[]
}

/** Same place from src/services (tsx) and dist/services (built). */
const FILE = fileURLToPath(new URL('../../content/content.json', import.meta.url))

let current: Content | null = null
let placeIds = new Set<string>()

function load(): Content {
  const raw = readFileSync(FILE, 'utf8')
  const body = JSON.parse(raw) as Omit<Content, 'version' | 'loadedAt'>
  if (!Array.isArray(body.places) || !Array.isArray(body.roles) || !Array.isArray(body.events)) {
    throw new Error(`${FILE}: expected { places, roles, events }`)
  }
  const version = createHash('sha1').update(raw).digest('hex').slice(0, 12)
  return { version, loadedAt: new Date().toISOString(), ...body }
}

/** The content, read once (a deploy restarts the process with the new file). */
export function getContent(): Content {
  if (!current) {
    current = load()
    placeIds = new Set(current.places.map((p) => p.id))
  }
  return current
}

/** Whether an approved place with this id exists. */
export function hasPlace(id: string): boolean {
  getContent()
  return placeIds.has(id)
}
