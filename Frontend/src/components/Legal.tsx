import { useState } from 'react'
import { LEGAL, type LegalKind } from '../i18n/legal'
import { useQuest } from '../store/QuestContext'
import Sheet from './Sheet'

/** The text of the terms of use or the privacy policy. */
export function LegalContent({ kind }: { kind: LegalKind }) {
  const { lang } = useQuest()
  const doc = LEGAL[lang][kind]
  return (
    <article className="space-y-4 text-[13px] leading-relaxed text-bark">
      <p className="text-[11px] font-bold uppercase tracking-widest text-bark/50">{doc.updated}</p>
      <p>{doc.intro}</p>
      {doc.sections.map((s) => (
        <section key={s.h} className="space-y-1.5">
          <h2 className="text-[14px] font-extrabold text-ink">{s.h}</h2>
          {s.p.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
    </article>
  )
}

/** "Terms · Privacy" links that open the text in a sheet (so a half-filled form isn't lost). */
export function LegalLinks({ className = '' }: { className?: string }) {
  const { lang } = useQuest()
  const [open, setOpen] = useState<LegalKind | null>(null)
  return (
    <span className={className}>
      {(['terms', 'privacy'] as const).map((k, i) => (
        <span key={k}>
          {i > 0 && ' · '}
          <button type="button" onClick={() => setOpen(k)} className="font-bold text-teal underline underline-offset-2">
            {LEGAL[lang][k].title}
          </button>
        </span>
      ))}
      {open && (
        <Sheet title={LEGAL[lang][open].title} onClose={() => setOpen(null)}>
          <LegalContent kind={open} />
        </Sheet>
      )}
    </span>
  )
}
