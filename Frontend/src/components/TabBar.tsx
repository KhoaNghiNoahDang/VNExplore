import { useEffect, useRef, useState } from 'react'
import { Compass, ScrollText, UserRound, type LucideIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'

/**
 * Hide while reading (scrolling down) or typing; show again when:
 * scrolling up, near the top or the bottom, changing page, or after a tap
 * leaves nothing to scroll (e.g. a filter made the list short) — so it can never get stuck hidden.
 */
export function useAutoHide(): boolean {
  const [hidden, setHidden] = useState(false)
  const last = useRef(new WeakMap<EventTarget, number>())
  const { pathname } = useLocation()

  // New page → always show.
  useEffect(() => setHidden(false), [pathname])

  useEffect(() => {
    const frame = document.getElementById('app-frame')
    if (!frame) return
    const scrollable = (el: HTMLElement) => el.scrollHeight > el.clientHeight + 40

    const onScroll = (e: Event) => {
      const el = e.target
      if (!(el instanceof HTMLElement)) return
      const y = el.scrollTop
      const known = last.current.has(el)
      const prev = last.current.get(el) ?? 0
      last.current.set(el, y)
      if (!scrollable(el) || y < 24 || y + el.clientHeight >= el.scrollHeight - 8) return setHidden(false)
      if (!known) return // first event (e.g. restored scroll position) is only a baseline
      if (y - prev > 6) setHidden(true)
      else if (prev - y > 6) setHidden(false)
    }

    // After a tap, if the content can't be scrolled any more (or is back at the top), show the bar.
    const onClick = () =>
      setTimeout(() => {
        const areas = [...frame.querySelectorAll<HTMLElement>('.thin-scroll')]
        if (!areas.some((el) => scrollable(el) && el.scrollTop >= 24)) setHidden(false)
      }, 50)

    const typing = (el: EventTarget | null) =>
      el instanceof HTMLTextAreaElement ||
      (el instanceof HTMLInputElement && !['checkbox', 'radio', 'button', 'submit'].includes(el.type))
    const onFocusIn = (e: FocusEvent) => typing(e.target) && setHidden(true)
    const onFocusOut = (e: FocusEvent) => typing(e.target) && setTimeout(() => setHidden(false), 120)
    frame.addEventListener('scroll', onScroll, true)
    frame.addEventListener('click', onClick)
    frame.addEventListener('focusin', onFocusIn)
    frame.addEventListener('focusout', onFocusOut)
    return () => {
      frame.removeEventListener('scroll', onScroll, true)
      frame.removeEventListener('click', onClick)
      frame.removeEventListener('focusin', onFocusIn)
      frame.removeEventListener('focusout', onFocusOut)
    }
  }, [])
  return hidden
}

function scrollAllToTop() {
  document
    .getElementById('app-frame')
    ?.querySelectorAll<HTMLElement>('.thin-scroll')
    .forEach((el) => el.scrollTo({ top: 0, behavior: 'smooth' }))
}

/** Pages that show the floating tab bar (the home page docks it under its own button instead). */
const FLOATING = ['/quests', '/me']

/**
 * Bottom navigation: Plan · Quests · Me.
 * - floating (Quests, Me): pill above the home indicator, slides away while reading
 * - docked (home page): a row under the page's main button, so there is only ever one bottom bar
 */
export default function TabBar({ docked = false }: { docked?: boolean }) {
  const { t } = useQuest()
  const { session, enabled } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const hidden = useAutoHide()

  if (!docked && !FLOATING.includes(pathname)) return null

  const tabs: { to: string; icon: LucideIcon; label: string; active: boolean }[] = [
    { to: '/', icon: Compass, label: t.tabGo, active: pathname === '/' },
    { to: '/quests', icon: ScrollText, label: t.tabQuests, active: pathname.startsWith('/quests') },
    ...(enabled
      ? [{ to: session ? '/me' : '/login?next=/me', icon: UserRound, label: t.tabMe, active: pathname === '/me' }]
      : []),
  ]

  const row = (
    <nav className="flex items-stretch justify-around" aria-label="Main">
      {tabs.map(({ to, icon: Icon, label, active }) => (
        <button
          key={label}
          onClick={() => (active ? scrollAllToTop() : navigate(to))}
          aria-current={active ? 'page' : undefined}
          className={`flex min-w-16 flex-1 flex-col items-center gap-0.5 py-1.5 text-[11px] font-bold transition ${
            active ? 'text-ink' : 'text-bark/60 hover:text-ink'
          }`}
        >
          <span
            className={`flex h-7 w-14 items-center justify-center rounded-full transition ${active ? 'bg-sun/45' : ''}`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
          </span>
          {label}
        </button>
      ))}
    </nav>
  )

  if (docked) {
    return (
      <div
        className={`overflow-hidden transition-all duration-200 ${hidden ? 'max-h-0 opacity-0' : 'mt-2 max-h-20 opacity-100'}`}
      >
        {row}
      </div>
    )
  }

  return (
    <div
      className={`absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 rounded-[22px] border border-sand bg-paper/95 px-1 py-1 shadow-[0_8px_24px_-10px_rgba(58,42,26,0.35)] backdrop-blur transition-transform duration-200 ${
        hidden ? 'translate-y-[160%]' : 'translate-y-0'
      }`}
    >
      {row}
    </div>
  )
}
