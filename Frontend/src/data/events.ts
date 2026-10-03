import type { QuestEvent } from '../types'
import eventsJson from './generated/events.json'

/**
 * Approved events, exported from Data/sheets/events.csv by Data/scripts/export_app.mjs.
 * Edit the sheet (not this file), then re-run the export. Used when Supabase has no events table yet.
 */
// Shape is checked by export_app.mjs, so the cast is safe.
export const EVENTS = eventsJson as unknown as QuestEvent[]
