import { Camera, Eye, Heart, Lightbulb, UtensilsCrossed, type LucideIcon } from 'lucide-react'
import { MODE_INFO, THEME_LABEL } from '../i18n/strings'
import { duration, moneyRange } from '../lib/format'
import type { SavedQuest, TipKind } from '../lib/quests'
import { useQuest } from '../store/QuestContext'
import type { Mode, Place } from '../types'
import { initials } from './AccountButton'
import { MODE_ICON, TONE_BG } from './icons'
import PlaceThumb from './PlaceThumb'
import { DongSonDrum } from './VnArt'

/** Each tip kind always has the same colour + icon, so it can be recognised at a glance. */
export const TIP_STYLE: Record<TipKind, { icon: LucideIcon; cls: string }> = {
  try: { icon: UtensilsCrossed, cls: 'bg-sun/25 text-bark' },
  photo: { icon: Camera, cls: 'bg-teal/10 text-teal' },
  see: { icon: Eye, cls: 'bg-leaf/10 text-leaf' },
  tip: { icon: Lightbulb, cls: 'bg-brick/10 text-brick' },
}

export function TipBox({ kind, text, compact = false }: { kind: TipKind; text: string; compact?: boolean }) {
  const { t } = useQuest()
  const { icon: Icon, cls } = TIP_STYLE[kind]
  return (
    <div className={`flex items-start gap-2 rounded-xl ${compact ? 'px-2.5 py-1.5 text-[12px]' : 'px-3 py-2 text-[13px]'} ${cls}`}>
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p className="min-w-0 leading-snug">
        <span className="font-bold">{t.tipKind[kind]}:</span> {text}
      </p>
    </div>
  )
}

export function ModeBadges({ modes, size = 'sm' }: { modes: Mode[]; size?: 'sm' | 'md' }) {
  const { lang } = useQuest()
  return (
    <div className="flex flex-wrap gap-1.5">
      {modes.map((m) => {
        const Icon = MODE_ICON[m]
        return (
          <span
            key={m}
            className={`inline-flex items-center gap-1 rounded-full border border-sand bg-white font-bold text-bark ${
              size === 'md' ? 'px-2.5 py-1 text-[12px]' : 'px-2 py-0.5 text-[11px]'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {MODE_INFO[lang][m].name}
          </span>
        )
      })}
    </div>
  )
}

export function Avatar({ name, url, size = 'sm' }: { name?: string | null; url?: string | null; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'h-9 w-9 text-[12px]' : 'h-6 w-6 text-[9px]'
  return (
    <span className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brick font-bold text-white ${dim}`}>
      {url ? <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" /> : initials(name)}
    </span>
  )
}

/** Card in the Quest tab. The cover is the first stop's illustration until real photos exist. */
export function QuestCard({ quest, cover, onOpen }: { quest: SavedQuest; cover?: Place; onOpen: () => void }) {
  const { t, lang } = useQuest()
  const tip = quest.stops?.find((s) => s.tip_kind && s.note)
  const author = quest.author?.username ? `@${quest.author.username}` : quest.author?.display_name ?? ''
  return (
    <article className="overflow-hidden rounded-[24px] border-2 border-sand bg-white transition hover:border-bark/30">
      <button onClick={onOpen} className="block w-full text-left" aria-label={quest.title}>
        {/* cover */}
        <div className={`relative flex h-24 items-center gap-3 overflow-hidden px-4 ${cover ? TONE_BG[cover.tone] : 'bg-butter'}`}>
          <DongSonDrum className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 opacity-25" />
          {cover && <PlaceThumb place={cover} className="relative h-16 w-16 rounded-2xl bg-white/60" />}
          <div className="relative min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest opacity-70">{t.stopsN(quest.stop_count)}</div>
            <div className="truncate text-[13px] font-bold">{cover?.name[lang]}</div>
          </div>
        </div>

        <div className="space-y-2 p-4">
          <h3 className="text-[16px] font-bold leading-snug">{quest.title}</h3>
          <div className="flex items-center gap-2 text-[12px] text-bark/80">
            <Avatar name={quest.author?.display_name} url={quest.author?.avatar_url} />
            <span className="min-w-0 truncate font-medium">{author}</span>
            <span className="ml-auto flex shrink-0 items-center gap-1 font-bold text-brick">
              <Heart className="h-3.5 w-3.5" /> {quest.like_count}
            </span>
          </div>
          <div className="text-[12px] font-medium text-bark">
            {[
              quest.total_min ? duration(quest.total_min, lang) : null,
              quest.cost_max_k != null ? `${moneyRange(quest.cost_min_k ?? 0, quest.cost_max_k, lang)}${quest.people > 1 ? ` ${t.forN(quest.people)}` : ''}` : null,
              ...quest.themes.slice(0, 2).map((th) => THEME_LABEL[lang][th]),
            ]
              .filter(Boolean)
              .join(' · ')}
          </div>
          <ModeBadges modes={quest.modes} />
          {tip && <TipBox kind={tip.tip_kind!} text={tip.note!} compact />}
        </div>
      </button>
    </article>
  )
}

/** Grey placeholder card while the feed loads (keeps the layout from jumping). */
export function QuestCardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-[24px] border-2 border-sand bg-white">
      <div className="h-24 bg-butter/60" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-3/4 rounded bg-sand/70" />
        <div className="h-3 w-1/2 rounded bg-sand/60" />
        <div className="h-3 w-2/3 rounded bg-sand/50" />
      </div>
    </div>
  )
}
