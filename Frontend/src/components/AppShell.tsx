import type { ReactNode } from 'react'
import { BookOpen, Timer, Wallet } from 'lucide-react'
import { useQuest } from '../store/QuestContext'
import Logo from './Logo'

/**
 * Mobile: the app fills the screen.
 * Tablet/desktop: the app sits in a phone frame on the cream "presentation board" from the design.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const { t } = useQuest()
  const icons = [Timer, BookOpen, Wallet]

  return (
    <div className="relative min-h-dvh overflow-hidden bg-cream md:flex md:flex-col md:items-center">
      <div className="pointer-events-none absolute left-0 top-0 m-8 hidden h-64 w-64 rounded-tl-3xl border-l-2 border-t-2 border-sand opacity-40 md:block" />
      <div className="pointer-events-none absolute bottom-24 right-0 m-8 hidden h-64 w-64 rounded-br-3xl border-b-2 border-r-2 border-sand opacity-40 md:block" />

      <header className="hidden w-full max-w-6xl items-start justify-between px-10 pt-8 md:flex">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-ink">
            <Logo className="h-8 w-8" />
          </div>
          <div>
            <div className="text-3xl font-bold tracking-tight">VNExplore</div>
            <div className="text-sm font-medium tracking-widest text-brick">{t.tagline}</div>
          </div>
        </div>
        <span className="rounded-full border border-sand px-4 py-1 text-xs font-bold tracking-widest text-ink/60">
          {t.badge}
        </span>
      </header>

      <main
        id="app-frame"
        className="relative flex h-dvh w-full flex-col overflow-hidden bg-paper
          md:my-6 md:h-[min(844px,calc(100dvh-220px))] md:min-h-[640px] md:w-[400px]
          md:rounded-[48px] md:border-[8px] md:border-ink md:shadow-[0_20px_50px_-12px_rgba(58,42,26,0.12)]"
      >
        {children}
      </main>

      <footer className="mt-auto hidden w-full bg-ink px-10 py-6 md:block">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6">
          {t.principles.map((p, i) => {
            const Icon = icons[i]
            return (
              <div key={p} className="flex items-center gap-3 text-white/90">
                <Icon className="h-6 w-6 text-sun" />
                <span className="text-xs font-bold uppercase tracking-[0.2em]">{p}</span>
              </div>
            )
          })}
        </div>
      </footer>
    </div>
  )
}
