import { UserRound } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'

export function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase()
}

/** Round avatar (signed in) or a person icon (signed out) in the top bar. */
export default function AccountButton() {
  const { t } = useQuest()
  const { enabled, session, profile } = useAuth()
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  if (!enabled) return null

  if (session) {
    return (
      <button
        onClick={() => navigate('/me')}
        className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brick text-[11px] font-bold text-white ring-2 ring-sun/60 transition hover:ring-sun"
        aria-label={t.account}
        title={profile?.display_name ?? t.account}
      >
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          initials(profile?.display_name)
        )}
      </button>
    )
  }
  return (
    <button
      onClick={() => navigate(`/login?next=${encodeURIComponent(pathname + search)}`)}
      className="flex h-8 shrink-0 items-center gap-1 rounded-full border border-sand bg-white px-2.5 text-[11px] font-bold hover:bg-butter"
      aria-label={t.signIn}
    >
      <UserRound className="h-3.5 w-3.5" /> <span className="hidden min-[380px]:inline">{t.signIn}</span>
    </button>
  )
}
