import { useState } from 'react'
import { Check, ChevronDown, Clock3 } from 'lucide-react'
import { TRANSPORTS } from '../data/transport'
import { TRANSPORT_INFO } from '../i18n/strings'
import { useQuest } from '../store/QuestContext'
import type { Transport } from '../types'
import Sheet from './Sheet'
import TransportIcon from './TransportIcon'

function toLocalInput(ms: number): string {
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Transport + departure time chips. Tapping opens a sheet to change them.
 * `transport` is what to show (on the first screen it comes from the text being typed).
 */
export default function TripChips({ transport, isDefault = false }: { transport: Transport; isDefault?: boolean }) {
  const { lang, t, travel, setTransport, setDepartAt } = useQuest()
  const [open, setOpen] = useState<'transport' | 'depart' | null>(null)
  const [custom, setCustom] = useState(() => toLocalInput(Date.now() + 60 * 60_000))
  const info = TRANSPORT_INFO[lang]

  const departLabel = travel.departAt
    ? new Date(travel.departAt).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-GB', {
        weekday: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : t.departNow

  const chip =
    'inline-flex items-center gap-1.5 rounded-full border border-sand bg-white py-1 pl-1 pr-2.5 text-[11px] font-bold transition hover:border-bark/40'

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button className={chip} onClick={() => setOpen('transport')} aria-haspopup="dialog">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal/10 text-teal">
            <TransportIcon transport={transport} className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          {info[transport].name}
          {isDefault && <span className="font-medium opacity-50">· {t.defaultSuffix}</span>}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
        <button className={chip} onClick={() => setOpen('depart')} aria-haspopup="dialog">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sun/30 text-bark">
            <Clock3 className="h-3.5 w-3.5" strokeWidth={2.25} />
          </span>
          {departLabel}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </button>
      </div>

      {open === 'transport' && (
        <Sheet title={t.transportTitle} onClose={() => setOpen(null)}>
          <div className="space-y-2" role="radiogroup">
            {TRANSPORTS.map((tr) => {
              const on = tr === transport
              return (
                <button
                  key={tr}
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setTransport(tr)
                    setOpen(null)
                  }}
                  className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition ${
                    on ? 'border-ink bg-white' : 'border-sand bg-white/60 hover:bg-white'
                  }`}
                >
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      on ? 'bg-teal text-white' : 'bg-butter text-bark'
                    }`}
                  >
                    <TransportIcon transport={tr} className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">{info[tr].name}</div>
                    <div className="text-[11px] leading-snug opacity-60">{info[tr].desc}</div>
                  </div>
                  {on && <Check className="h-4 w-4 shrink-0" strokeWidth={3} />}
                </button>
              )
            })}
          </div>
          <p className="mt-4 text-[11px] opacity-60">{t.estimateNote}</p>
        </Sheet>
      )}

      {open === 'depart' && (
        <Sheet title={t.departTitle} onClose={() => setOpen(null)}>
          <div className="grid grid-cols-3 gap-2">
            {[null, 1, 2].map((h) => {
              const on = h === null ? !travel.departAt : false
              return (
                <button
                  key={h ?? 'now'}
                  onClick={() => {
                    setDepartAt(h === null ? null : Date.now() + h * 60 * 60_000)
                    setOpen(null)
                  }}
                  className={`rounded-xl border-2 py-3 text-xs font-bold ${on ? 'border-ink bg-white' : 'border-sand bg-white/60 hover:bg-white'}`}
                >
                  {h === null ? t.departNow : t.departIn(h)}
                </button>
              )
            })}
          </div>
          <label className="mt-4 block text-[11px] font-bold uppercase tracking-widest opacity-50">{t.departPick}</label>
          <div className="mt-2 flex gap-2">
            <input
              type="datetime-local"
              value={custom}
              min={toLocalInput(Date.now())}
              onChange={(e) => setCustom(e.target.value)}
              className="min-w-0 flex-1 rounded-xl border-2 border-sand bg-white px-3 py-2 text-sm focus:border-teal focus:outline-none"
            />
            <button
              onClick={() => {
                const ms = new Date(custom).getTime()
                if (!Number.isNaN(ms)) setDepartAt(ms)
                setOpen(null)
              }}
              className="shrink-0 rounded-xl bg-sun px-4 text-xs font-bold"
            >
              {t.departApply}
            </button>
          </div>
          <p className="mt-4 text-[11px] opacity-60">{t.departNote}</p>
        </Sheet>
      )}
    </>
  )
}
