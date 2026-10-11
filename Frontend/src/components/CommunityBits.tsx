import { useState } from 'react'
import { CircleCheck, Flag, Loader2, UsersRound } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CONFIRM_AT, flagCommunityPlace, type FlagReason } from '../lib/community'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'
import type { Place } from '../types'
import Sheet from './Sheet'

/**
 * "Not confirmed yet · 3/10 people have been here" on a place a traveller added. Gone once
 * CONFIRM_AT people have reached it.
 */
export function CommunityBadge({ place, className = '' }: { place: Place; className?: string }) {
  const { t } = useQuest()
  if (!place.community || place.community.confirmed) return null
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-dashed border-sun-dark/60 bg-sun/10 px-3 py-2 text-[11px] leading-snug text-bark ${className}`}>
      <UsersRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sun-dark" />
      <span>
        <span className="font-bold">{t.communityUnconfirmed(place.community.visits, CONFIRM_AT)}</span>{' '}
        <span className="text-bark/75">{t.communityHint(CONFIRM_AT)}</span>
      </span>
    </div>
  )
}

/** Small inline label for tight spots (map cards, route list). */
export function CommunityTag({ place }: { place: Place }) {
  const { t } = useQuest()
  if (!place.community || place.community.confirmed) return null
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sun/25 px-1.5 py-0.5 text-[9px] font-bold text-bark">
      <UsersRound className="h-2.5 w-2.5" /> {t.communityShort(place.community.visits, CONFIRM_AT)}
    </span>
  )
}

/** "Something's wrong with this place?" — reports from travellers hide an unconfirmed place. */
export function FlagPlaceButton({ place, className = '' }: { place: Place; className?: string }) {
  const { t } = useQuest()
  const [open, setOpen] = useState(false)
  if (!place.community || place.community.confirmed) return null
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex min-h-9 items-center gap-1 text-[11px] font-bold text-bark/60 hover:text-brick ${className}`}
      >
        <Flag className="h-3.5 w-3.5" /> {t.flagButton}
      </button>
      {open && <FlagSheet place={place} onClose={() => setOpen(false)} />}
    </>
  )
}

function FlagSheet({ place, onClose }: { place: Place; onClose: () => void }) {
  const { t } = useQuest()
  const { session } = useAuth()
  const navigate = useNavigate()
  const here = useLocation()
  const [reason, setReason] = useState<FlagReason | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(false)
  const reasons: FlagReason[] = ['not_real', 'wrong_place', 'closed', 'spam']

  const send = async () => {
    if (!reason) return
    setBusy(true)
    setError(false)
    try {
      await flagCommunityPlace(place.id, reason, note.trim())
      setDone(true)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet title={t.flagTitle} closeLabel={t.close} onClose={onClose}>
      {done ? (
        <p className="flex items-start gap-2 rounded-2xl bg-leaf/10 px-3 py-3 text-[13px] font-medium text-leaf" role="status">
          <CircleCheck className="mt-0.5 h-4 w-4 shrink-0" /> {t.flagThanks}
        </p>
      ) : !session ? (
        <>
          <p className="text-[13px] text-bark/80">{t.flagSignIn}</p>
          <button
            onClick={() => navigate(`/login?next=${encodeURIComponent(here.pathname)}`)}
            className="mt-4 flex min-h-12 w-full items-center justify-center rounded-2xl bg-teal px-4 font-bold text-white"
          >
            {t.signIn}
          </button>
        </>
      ) : (
        <>
          <p className="text-[13px] font-bold">{place.name.vi}</p>
          <div className="mt-3 space-y-2">
            {reasons.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={reason === r}
                onClick={() => setReason(r)}
                className={`flex min-h-11 w-full items-center rounded-xl border-2 px-3 text-left text-[13px] font-bold transition ${
                  reason === r ? 'border-brick bg-brick/5 text-brick' : 'border-sand bg-white text-bark hover:border-brick/40'
                }`}
              >
                {t.flagReasons[r]}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={300}
            placeholder={t.flagNotePh}
            className="mt-3 min-h-16 w-full rounded-xl border-2 border-sand bg-white p-3 text-[13px] outline-none focus:border-teal"
          />
          {error && (
            <p className="mt-2 text-[12px] font-medium text-brick" role="alert">
              {t.addPlaceSubmitError}
            </p>
          )}
          <button
            type="button"
            disabled={!reason || busy}
            onClick={send}
            className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brick px-4 font-bold text-white disabled:bg-sand disabled:text-bark/50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.flagSend}
          </button>
        </>
      )}
    </Sheet>
  )
}
