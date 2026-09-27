import { createContext } from 'react'
import type { AuthState } from './AuthContext'

/** Own module so the context object survives hot reloads (see ctx.ts). */
export const AuthCtx = createContext<AuthState | null>(null)
