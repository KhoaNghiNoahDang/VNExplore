import { createContext } from 'react'
import type { QuestState } from './QuestContext'

/**
 * Kept in its own tiny module so the context object survives hot reloads:
 * when QuestContext.tsx (or the strings it imports) is edited, this file is not
 * re-run, so the provider and useQuest() keep sharing the same context.
 */
export const QuestCtx = createContext<QuestState | null>(null)
