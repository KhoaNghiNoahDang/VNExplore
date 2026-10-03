import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Plus, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MODE_ICON } from '../components/icons'
import { QuestCard, QuestCardSkeleton } from '../components/QuestBits'
import { useAutoHide } from '../components/TabBar'
import { DongSonBand, DongSonDrum, Lotus } from '../components/VnArt'
import { MODE_INFO, THEME_LABEL } from '../i18n/strings'
import { listPublicQuests, type SavedQuest } from '../lib/quests'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'
import type { Mode, Theme } from '../types'

const MODES: Mode[] = ['explore', 'listen', 'easy']
const THEMES: Theme[] = ['food', 'photo', 'history', 'culture', 'rainy', 'fun']
const SCROLL_KEY = 'vnexplore:questsScroll'

export default function QuestsPage() {
  const { t, lang, places } = useQuest()
  const { isMember } = useAuth()
  const navigate = useNavigate()
  const tabHidden = useAutoHide()
  const [quests, setQuests] = useState<SavedQuest[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [mode, setMode] = useState<Mode | null>(null)
  const [theme, setTheme] = useState<Theme | null>(null)
  const [scrolled, setScrolled] = useState(false)
  const scroller = useRef<HTMLDivElement>(null)

  const load = () => {
    setFailed(false)
    setQuests(null)
    listPublicQuests()
      .then(setQuests)
      .catch(() => {
        setFailed(true)
        setQuests([])
      })
  }
  useEffect(load, [])

  // Remember where you were in the feed when coming back from a quest.
  useEffect(() => {
    const el = scroller.current
    if (!el || !quests) return
    try {
      el.scrollTop = Number(sessionStorage.getItem(SCROLL_KEY) ?? 0)
    } catch {
      /* ignore */
    }
  }, [quests])
  const onScroll = () => {
    const y = scroller.current?.scrollTop ?? 0
    setScrolled(y > 600)
    try {
      sessionStorage.setItem(SCROLL_KEY, String(y))
    } catch {
      /* ignore */
    }
  }

  const shown = useMemo(
    () => (quests ?? []).filter((q) => (!mode || q.modes.includes(mode)) && (!theme || q.themes.includes(theme))),
    [quests, mode, theme],
  )
  // Changing a filter shows the list from the top (and brings the tab bar back).
  useEffect(() => {
    const el = scroller.current
    if (el && el.scrollTop > 0) el.scrollTo({ top: 0 })
  }, [mode, theme])
    const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places])
  const create = () => navigate(isMember ? '/create' : '/login?next=/create')

  const chip = (on: boolean) =>
    `inline-flex shrink-0 items-center gap-1 rounded-full border-2 px-3 py-1.5 text-[12px] font-bold transition ${
      on ? 'border-ink bg-ink text-paper' : 'border-sand bg-white text-bark hover:border-bark/30'
    }`

  return (
    <div ref={scroller} onScroll={onScroll} className="thin-scroll relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
      {/* Header */}
      <header className="relative overflow-hidden px-6 pb-3 pt-[max(1.25rem,env(safe-area-inset-top))]">
        <DongSonDrum className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 text-sand/60" />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <h1 className="text-[26px] font-bold leading-tight">{t.questsTitle}</h1>
            <p className="mt-1 max-w-[16rem] text-[13px] text-bark/80">{t.questsSub}</p>
          </div>
          <button
            onClick={create}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-sun px-3.5 py-2 text-[13px] font-bold shadow-sm transition hover:bg-sun-dark active:scale-95"
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} /> {t.createQuest}
          </button>
        </div>
      </header>

      {/* Filters: stick to the top while scrolling */}
      <div className="sticky top-0 z-10 border-b border-sand/60 bg-paper/95 backdrop-blur">
        <div className="flex gap-2 overflow-x-auto px-6 py-2.5 [scrollbar-width:none]">
          <button className={chip(!mode && !theme)} onClick={() => (setMode(null), setTheme(null))}>
            {t.filterAll}
          </button>
          {MODES.map((m) => {
            const Icon = MODE_ICON[m]
            return (
              <button key={m} className={chip(mode === m)} onClick={() => setMode(mode === m ? null : m)} aria-pressed={mode === m}>
                <Icon className="h-3.5 w-3.5" /> {MODE_INFO[lang][m].name}
              </button>
            )
          })}
          <span className="w-px shrink-0 self-stretch bg-sand" aria-hidden />
          {THEMES.map((th) => (
            <button key={th} className={chip(theme === th)} onClick={() => setTheme(theme === th ? null : th)} aria-pressed={theme === th}>
              {THEME_LABEL[lang][th]}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-4 px-6 pb-32 pt-4">
        {quests === null ? (
          [0, 1, 2].map((i) => <QuestCardSkeleton key={i} />)
        ) : failed ? (
          <div className="flex flex-col items-center py-10 text-center">
            <p className="text-sm text-bark/80">{t.authErr.unknown}</p>
            <button onClick={load} className="mt-3 flex items-center gap-1.5 rounded-full border-2 border-sand bg-white px-4 py-2 text-sm font-bold">
              <RefreshCw className="h-4 w-4" /> OK
            </button>
          </div>
        ) : quests.length === 0 ? (
          <div className="relative mt-4 flex flex-col items-center overflow-hidden rounded-[28px] border-2 border-dashed border-sand bg-white/60 px-6 py-10 text-center">
            <DongSonDrum className="pointer-events-none absolute -bottom-20 h-64 w-64 text-sand/40" />
            <Lotus className="relative h-14 w-14" />
            <p className="relative mt-3 text-[17px] font-bold">{t.noPublicQuests}</p>
            <p className="relative mt-1 text-[13px] leading-relaxed text-bark/80">{t.noPublicQuestsSub}</p>
            <button
              onClick={create}
              className="relative mt-5 flex items-center gap-1.5 rounded-2xl border-b-4 border-sun-dark bg-sun px-5 py-3 text-sm font-bold shadow-md"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} /> {t.createQuest}
            </button>
          </div>
        ) : shown.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-bark/80">{t.noMatch}</p>
            <button onClick={() => (setMode(null), setTheme(null))} className="mt-2 text-sm font-bold text-teal underline underline-offset-2">
              {t.clearFilters}
            </button>
          </div>
        ) : (
          shown.map((q) => (
            <QuestCard
              key={q.id}
              quest={q}
              cover={q.cover_place_id ? byId.get(q.cover_place_id) : undefined}
              onOpen={() => navigate(`/q/${q.id}`)}
            />
          ))
        )}
        {quests && quests.length > 0 && <DongSonBand className="mx-auto h-2 w-24 text-sand" />}
      </div>

      {/* Back to top: appears where the tab bar was, only after scrolling far */}
      <button
        onClick={() => scroller.current?.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label={t.backToTop}
        className={`absolute bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-20 flex h-11 w-11 items-center justify-center rounded-full border-2 border-sand bg-white shadow-md transition ${
          scrolled && tabHidden ? 'scale-100 opacity-100' : 'pointer-events-none scale-75 opacity-0'
        }`}
      >
        <ArrowUp className="h-5 w-5" />
      </button>
    </div>
  )
}
