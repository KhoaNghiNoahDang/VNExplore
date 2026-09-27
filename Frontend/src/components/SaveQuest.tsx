import { useEffect, useState } from 'react'
import { Bookmark, Check, Clock3, Copy, Globe, Link2, Loader2, Lock, PencilLine, Share2 } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { MODE_INFO } from '../i18n/strings'
import type { QuestSummary } from '../lib/quest'
import { questUrl, upsertQuest, type Visibility } from '../lib/quests'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'
import { Field } from './Form'
import PrimaryButton from './PrimaryButton'
import Sheet from './Sheet'
import { Lotus } from './VnArt'

/**
 * "Save as quest" button + sheet. Not signed in → go to /login and come back here
 * with ?save=1, which reopens the sheet automatically.
 */
export default function SaveQuestButton({ summary, className = '' }: { summary: QuestSummary; className?: string }) {
  const { t, lang, mode, role, intent, travel } = useQuest()
  const auth = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [params, setParams] = useSearchParams()
  const [open, setOpen] = useState(false)

  // Back from the login page with ?save=1 → open the sheet.
  useEffect(() => {
    if (params.get('save') === '1' && auth.session) {
      setOpen(true)
      params.delete('save')
      setParams(params, { replace: true })
    }
  }, [params, setParams, auth.session])

  if (!auth.enabled || !summary.stops.length) return null

  const onClick = () => {
    if (auth.session) setOpen(true)
    else navigate(`/login?next=${encodeURIComponent(`${pathname}?save=1`)}`)
  }

  const defaultTitle =
    mode === 'explore' && role
      ? t.questTitle.explore(role.name[lang])
      : `${MODE_INFO[lang][mode ?? 'listen'].name} · ${summary.stops[0].name[lang]}`

  return (
    <>
      <button
        onClick={onClick}
        className={`flex items-center justify-center gap-2 rounded-2xl border-2 border-ink bg-white py-3 text-sm font-bold transition hover:bg-butter active:scale-[.99] ${className}`}
      >
        <Bookmark className="h-4 w-4" /> {t.saveQuest}
      </button>
      {open && auth.session && (
        <SaveSheet
          onClose={() => setOpen(false)}
          defaultTitle={defaultTitle}
          onCustomize={() => navigate('/create?from=route')}
          save={(title, description, visibility) =>
            upsertQuest(auth.session!.user.id, {
              title,
              description,
              visibility,
              // The mode you just used, plus Easy (every quest can be walked simply).
              modes: [...new Set([mode ?? 'listen', 'easy'])] as ('explore' | 'listen' | 'easy')[],
              roleId: role?.id ?? null,
              transport: travel.transport,
              people: intent?.people ?? 1,
              themes: intent?.themes ?? [],
              suitableFor: [],
              bestTime: 'any',
              stops: summary.stops.map((p) => ({ placeId: p.id, tipKind: null, tip: '' })),
              summary,
            })
          }
        />
      )}
    </>
  )
}

function SaveSheet({
  onClose,
  onCustomize,
  defaultTitle,
  save,
}: {
  onClose: () => void
  onCustomize: () => void
  defaultTitle: string
  save: (title: string, description: string, visibility: Visibility) => Promise<string>
}) {
  const { t } = useQuest()
  const [title, setTitle] = useState(defaultTitle)
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<Visibility>('unlisted')
  const [state, setState] = useState<'idle' | 'busy' | 'error'>('idle')
  const [savedId, setSavedId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const valid = title.trim().length >= 3 && title.trim().length <= 120

  if (savedId) {
    const url = questUrl(savedId)
    return (
      <Sheet title={t.saved} onClose={onClose}>
        <div className="flex flex-col items-center text-center">
          <Lotus className="h-14 w-14" />
          <p className="mt-2 text-sm font-bold">{title}</p>
          {visibility === 'public' && (
            <p className="mt-3 flex items-start gap-2 rounded-2xl bg-sun/20 px-3 py-2.5 text-left text-[12px] font-medium text-bark">
              <Clock3 className="mt-0.5 h-4 w-4 shrink-0" /> {t.pendingNote}
            </p>
          )}
          {visibility !== 'private' && (
            <>
              <div className="mt-4 flex w-full items-center gap-2 rounded-2xl border-2 border-sand bg-white px-3 py-2.5 text-left text-[12px]">
                <Link2 className="h-4 w-4 shrink-0 text-teal" />
                <span className="min-w-0 flex-1 truncate">{url}</span>
              </div>
              <div className="mt-3 grid w-full grid-cols-2 gap-2">
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(url).catch(() => undefined)
                    setCopied(true)
                  }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border-2 border-ink py-2.5 text-xs font-bold"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? t.linkCopied : t.copyLink}
                </button>
                <button
                  onClick={() => navigator.share?.({ title, url }).catch(() => undefined)}
                  className="flex items-center justify-center gap-1.5 rounded-xl bg-teal py-2.5 text-xs font-bold text-white"
                >
                  <Share2 className="h-4 w-4" /> {t.shareLink}
                </button>
              </div>
            </>
          )}
        </div>
      </Sheet>
    )
  }

  const options: { key: Visibility; icon: typeof Lock; label: string; sub: string }[] = [
    { key: 'public', icon: Globe, label: t.visPublic, sub: t.visPublicSub },
    { key: 'unlisted', icon: Link2, label: t.visLink, sub: t.visLinkSub },
    { key: 'private', icon: Lock, label: t.visPrivate, sub: t.visPrivateSub },
  ]

  return (
    <Sheet title={t.saveTitle} onClose={onClose}>
      <div className="space-y-4">
        <Field label={t.questName} value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} />
        <div>
          <label className="mb-1 block text-[12px] font-bold text-ink/80">{t.questDesc}</label>
          <textarea
            value={description}
            maxLength={2000}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t.questDescPh}
            rows={3}
            className="w-full resize-none rounded-2xl border-2 border-sand bg-white p-3 text-[14px] placeholder:text-ink/30 focus:border-teal focus:outline-none"
          />
        </div>
        <div>
          <div className="mb-1 text-[12px] font-bold text-ink/80">{t.visibility}</div>
          <div className="grid grid-cols-3 gap-2" role="radiogroup">
            {options.map(({ key, icon: Icon, label, sub }) => (
              <button
                key={key}
                role="radio"
                aria-checked={visibility === key}
                onClick={() => setVisibility(key)}
                className={`rounded-2xl border-2 p-3 text-left transition ${visibility === key ? 'border-teal bg-teal/5' : 'border-sand bg-white'}`}
              >
                <Icon className={`h-4 w-4 ${visibility === key ? 'text-teal' : 'text-bark/60'}`} />
                <div className="mt-1 text-[13px] font-bold">{label}</div>
                <div className="text-[11px] text-bark/70">{sub}</div>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={onCustomize}
          className="flex w-full items-center gap-2 rounded-2xl border-2 border-dashed border-sand px-3 py-2.5 text-left text-[12px] font-bold text-teal hover:bg-teal/5"
        >
          <PencilLine className="h-4 w-4 shrink-0" /> {t.customizeQuest}
        </button>
        {state === 'error' && <p className="text-[12px] font-medium text-brick">{t.authErr.unknown}</p>}
        <PrimaryButton
          disabled={!valid || state === 'busy'}
          onClick={async () => {
            setState('busy')
            try {
              setSavedId(await save(title, description, visibility))
            } catch (err) {
              console.error(err)
              setState('error')
            }
          }}
        >
          {state === 'busy' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bookmark className="h-4 w-4" />}
          {state === 'busy' ? t.saving : t.save}
        </PrimaryButton>
      </div>
    </Sheet>
  )
}
