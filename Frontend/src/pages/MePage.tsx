import { useEffect, useState } from 'react'
import { AlertCircle, Check, Clock3, Copy, ExternalLink, Globe, Link2, Loader2, Lock, LogOut, PencilLine, Plus, Trash2 } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import LoginPage from './LoginPage'
import { SaveAchievementCard } from '../components/PartyBits'
import { initials } from '../components/AccountButton'
import { MODE_ICON } from '../components/icons'
import PrimaryButton from '../components/PrimaryButton'
import { DongSonBand, DongSonDrum, LakeScene, Lotus } from '../components/VnArt'
import { duration, moneyRange } from '../lib/format'
import { QuestCard } from '../components/QuestBits'
import Stamp from '../components/Stamp'
import { collectStamps } from '../lib/passport'
import { usePassport } from '../store/usePassport'
import { deleteQuest, listLikedQuests, listMyQuests, questUrl, type SavedQuest } from '../lib/quests'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'

export default function MePage() {
  const { t, lang, places } = useQuest()
  const { enabled, loading, session, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [quests, setQuests] = useState<SavedQuest[] | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [liked, setLiked] = useState<SavedQuest[]>([])
  const { journeys } = usePassport()

  useEffect(() => {
    if (!session) return
    listMyQuests(session.user.id).then(setQuests).catch(() => setQuests([]))
    listLikedQuests(session.user.id).then(setLiked).catch(() => setLiked([]))
  }, [session])

  if (!enabled) return <Navigate to="/" replace />
  // Checking the saved sign-in: a spinner, not an empty profile.
  if (loading)
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-bark/50" />
      </div>
    )
  // Signed out: the sign-in form right here (the tab bar stays, so there is always a way out).
  if (!session) return <LoginPage embedded after="/me" />

  return (
    <div className="thin-scroll relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <div className="relative h-36 shrink-0 overflow-hidden">
        <LakeScene className="absolute inset-0 h-full w-full" />
      </div>

      <div className="relative -mt-6 flex-1 rounded-t-[28px] bg-paper px-6 pb-32">
        <DongSonDrum className="pointer-events-none absolute -right-20 top-24 h-60 w-60 text-sand/50" />
        <div className="relative -mt-10 flex items-end gap-3">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-paper bg-brick text-2xl font-bold text-white shadow-md">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              initials(profile?.display_name)
            )}
          </div>
          <div className="min-w-0 pb-1">
            <h1 className="truncate text-xl font-bold">{profile ? t.hello(profile.display_name ?? '') : '…'}</h1>
            {profile?.username && <p className="text-[13px] font-medium text-bark/70">@{profile.username}</p>}
          </div>
        </div>

        <DongSonBand className="relative mt-5 h-2 w-full text-sand" />

        {/* A guest (group play): keep the achievements with a real account. */}
        <div className="relative mt-4">
          <SaveAchievementCard next="/me" />
        </div>

        <PassportCover journeys={journeys} onOpen={() => navigate('/passport')} />

        <div className="relative mt-5 flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-widest text-bark/60">{t.myQuests}</h2>
          <button
            onClick={() => navigate('/create')}
            className="flex items-center gap-1 rounded-full bg-sun px-3 py-1.5 text-[12px] font-bold shadow-sm transition hover:bg-sun-dark active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" strokeWidth={2.5} /> {t.createQuest}
          </button>
        </div>

        {quests === null ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-bark/50" />
          </div>
        ) : quests.length === 0 ? (
          <div className="relative mt-4 flex flex-col items-center rounded-3xl border-2 border-dashed border-sand bg-white/60 px-6 py-8 text-center">
            <Lotus className="h-12 w-12" />
            <p className="mt-2 font-bold">{t.noQuests}</p>
            <p className="mt-1 text-[13px] text-bark/70">{t.noQuestsSub}</p>
            <PrimaryButton className="mt-4 py-3" onClick={() => navigate('/')}>
              {t.planTrip}
            </PrimaryButton>
          </div>
        ) : (
          <ul className="relative mt-3 space-y-3">
            {quests.map((q) => {
              const Icon = MODE_ICON[q.modes[0] ?? q.mode]
              return (
                <li key={q.id} className="rounded-3xl border-2 border-sand bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-butter text-bark">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[15px] font-bold">{q.title}</div>
                      <div className="mt-0.5 text-[11px] text-bark/80">
                        {t.stopsN(q.stop_count)}
                        {q.total_min ? ` · ${duration(q.total_min, lang)}` : ''}
                        {q.cost_max_k != null ? ` · ${moneyRange(q.cost_min_k ?? 0, q.cost_max_k, lang)}` : ''}
                      </div>
                      <div className="mt-1.5 flex">
                        <StatusBadge quest={q} />
                      </div>
                    </div>
                  </div>
                  {q.review_status === 'rejected' && (
                    <p className="mt-2 flex items-start gap-1.5 rounded-xl bg-brick/10 px-2.5 py-1.5 text-[11px] font-medium text-brick">
                      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" /> {t.rejectedNote(q.review_note ?? '')}
                    </p>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => navigate(`/q/${q.id}`)}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-sun py-2 text-xs font-bold"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> {t.openQuest}
                    </button>
                    <button
                      onClick={() => navigate(`/create?edit=${q.id}`)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-sand hover:bg-cream"
                      aria-label={t.editQuest}
                    >
                      <PencilLine className="h-4 w-4" />
                    </button>
                    {q.visibility !== 'private' && (
                      <button
                        onClick={async () => {
                          await navigator.clipboard.writeText(questUrl(q.id)).catch(() => undefined)
                          setCopied(q.id)
                        }}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-sand hover:bg-cream"
                        aria-label={copied === q.id ? t.linkCopied : t.copyLink}
                      >
                        {copied === q.id ? <Check className="h-4 w-4 text-teal" /> : <Copy className="h-4 w-4" />}
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        if (!confirm(t.confirmDelete)) return
                        await deleteQuest(q.id)
                        setQuests((qs) => qs?.filter((x) => x.id !== q.id) ?? null)
                      }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-sand text-brick hover:bg-brick/5"
                      aria-label={t.deleteQuest}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {liked.length > 0 && (
          <>
            <h2 className="relative mt-8 text-[11px] font-bold uppercase tracking-widest text-bark/60">{t.likedQuests}</h2>
            <div className="relative mt-3 space-y-3">
              {liked.map((q) => (
                <QuestCard
                  key={q.id}
                  quest={q}
                  cover={places.find((p) => p.id === q.cover_place_id)}
                  onOpen={() => navigate(`/q/${q.id}`)}
                />
              ))}
            </div>
          </>
        )}

        <button
          onClick={async () => {
            await signOut()
            navigate('/')
          }}
          className="relative mt-8 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-sand bg-white py-3 text-sm font-bold text-bark hover:bg-cream"
        >
          <LogOut className="h-4 w-4" /> {t.signOut}
        </button>
      </div>
    </div>
  )
}

/** Who can see the quest, and where it is in review. */
function StatusBadge({ quest: q }: { quest: SavedQuest }) {
  const { t } = useQuest()
  const [cls, Icon, label] =
    q.visibility === 'private'
      ? ['bg-bark/10 text-bark', Lock, t.visPrivate]
      : q.visibility === 'unlisted'
        ? ['bg-teal/10 text-teal', Link2, t.visLink]
        : q.review_status === 'approved'
          ? ['bg-leaf/15 text-leaf', Globe, t.status.approved]
          : q.review_status === 'rejected'
            ? ['bg-brick/10 text-brick', AlertCircle, t.status.rejected]
            : ['bg-sun/30 text-bark', Clock3, t.status.pending]
  return (
    <span className={`flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      <Icon className="h-3 w-3" /> {label}
    </span>
  )
}

/** Passport "cover" on the Me page: the latest stamps + totals; tap to open the full passport. */
function PassportCover({ journeys, onOpen }: { journeys: import('../lib/passport').PassportJourney[] | null; onOpen: () => void }) {
  const { t, places } = useQuest()
  const stamps = collectStamps(journeys ?? [])
  const latest = [...stamps.values()].sort((a, b) => b.firstAt - a.firstAt).slice(0, 3)
  const gold = [...stamps.values()].filter((s) => s.gold).length
  return (
    <button
      onClick={onOpen}
      className="relative mt-5 flex w-full items-center gap-3 overflow-hidden rounded-[24px] bg-brick p-4 text-left text-white shadow-[0_12px_30px_-14px_rgba(142,48,32,0.7)] transition active:scale-[.99]"
    >
      <DongSonDrum className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 text-sun/25" />
      <div className="relative min-w-0 flex-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.25em] text-sun">VNExplore · Hà Nội</div>
        <div className="mt-0.5 text-[17px] font-bold">{t.passportBook}</div>
        <div className="mt-1 text-[12px] opacity-90">
          {journeys === null ? '…' : stamps.size ? t.passportStats(stamps.size, journeys.length, gold) : t.passportEmptyCover}
        </div>
        <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">
          {t.passportOpen} →
        </div>
      </div>
      <div className="relative flex shrink-0 -space-x-7">
        {latest.map((s, i) => {
          const p = places.find((x) => x.id === s.placeId)
          return p ? (
            <div key={s.placeId} className="scale-[0.7] rounded-full bg-paper">
              <Stamp place={p} index={i} size="sm" gold={s.gold} />
            </div>
          ) : null
        })}
      </div>
    </button>
  )
}
