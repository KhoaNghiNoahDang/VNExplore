import { useEffect, useState } from 'react'
import { listPassport, type PassportJourney } from '../lib/passport'
import { useAuth } from './AuthContext'

/** Load the passport for whoever is using the app (account, or this device for guests). */
export function usePassport() {
  const { session, loading } = useAuth()
  const userId = session?.user.id ?? null
  const [journeys, setJourneys] = useState<PassportJourney[] | null>(null)
  useEffect(() => {
    if (loading) return
    let alive = true
    listPassport(userId)
      .then((j) => alive && setJourneys(j))
      .catch(() => alive && setJourneys([]))
    return () => {
      alive = false
    }
  }, [userId, loading])
  return { journeys, setJourneys, userId }
}
