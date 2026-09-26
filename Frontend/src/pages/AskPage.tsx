import { useEffect, useMemo, useRef } from 'react'
import { ArrowRight, Lightbulb, Mic } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import IntentChips from '../components/IntentChips'
import LocationRow from '../components/LocationRow'
import ModePicker from '../components/ModePicker'
import PrimaryButton from '../components/PrimaryButton'
import TopBar from '../components/TopBar'
import TripChips from '../components/TripChips'
import { parseIntent } from '../lib/intent'
import { preselect, rankPlaces } from '../lib/quest'
import { useSpeech } from '../lib/useSpeech'
import { useQuest } from '../store/QuestContext'

export default function AskPage() {
  const { t, lang, draft, setDraft, setIntent, places, start, mode, transport: picked, setTransport, travel } = useQuest()
  const navigate = useNavigate()
  const speech = useSpeech(lang, setDraft)

  const text = draft.trim()
  const preview = useMemo(() => (text ? parseIntent(text) : null), [text])
  const ready = !!preview && !!mode

  // Naming a transport in the text replaces one picked by hand earlier.
  const textTransport = preview && !preview.transportIsDefault ? preview.transport : null
  const prevText = useRef(textTransport)
  useEffect(() => {
    if (textTransport && textTransport !== prevText.current) setTransport(null)
    prevText.current = textTransport
  }, [textTransport, setTransport])
  const shownTransport = picked ?? preview?.transport ?? 'walk'

  const submit = () => {
    if (!preview || !mode) return
    const ranked = rankPlaces(places, preview, start)
    setIntent(preview, preselect(ranked, preview, start, [], { transport: shownTransport, departAt: travel.departAt }))
    // Explore adds one step: choose a role (it then re-picks places that fit the role).
    navigate(mode === 'explore' ? '/role?next=/places&fresh=1' : '/places')
  }

  const cta = !preview ? t.showPlaces : !mode ? t.pickMode : mode === 'explore' ? t.chooseRole : t.showPlaces

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <TopBar />
      <div className="thin-scroll relative z-10 min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <div className="mb-4 mt-2">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-brick">{t.area}</div>
          <h1 className="text-[26px] font-bold leading-tight">{t.askTitle}</h1>
          <p className="mt-2 text-[13px] opacity-70">{t.askSub}</p>
        </div>

        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={speech.listening ? t.listening : t.askPlaceholder}
            rows={4}
            className="h-28 w-full resize-none rounded-2xl border-2 border-sand bg-white p-4 pb-16 text-sm leading-relaxed
              placeholder:text-ink/35 focus:border-teal focus:outline-none"
            aria-label={t.askTitle}
          />
          <div className="absolute bottom-3 right-3 flex gap-2">
            <button
              type="button"
              onClick={speech.toggle}
              disabled={!speech.supported}
              title={speech.supported ? t.voice : t.voiceUnsupported}
              aria-label={speech.supported ? t.voice : t.voiceUnsupported}
              className={`flex h-11 w-11 items-center justify-center rounded-full bg-teal text-white shadow-lg disabled:opacity-40 ${
                speech.listening ? 'listening' : ''
              }`}
            >
              <Mic className="h-5 w-5" />
            </button>
            <button
              type="submit"
              disabled={!ready}
              aria-label={cta}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-sun text-ink shadow-lg disabled:opacity-40"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </form>

        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-bark">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sun-dark" /> {t.transportTip}
        </p>

        <div className="-mx-6 mt-2 flex gap-2 overflow-x-auto px-6 pb-1 [scrollbar-width:none]">
          <span className="shrink-0 self-center text-[10px] font-bold uppercase tracking-widest opacity-50">{t.tryOne}</span>
          {t.examples.map((ex) => (
            <button
              key={ex}
              onClick={() => setDraft(ex)}
              className="shrink-0 whitespace-nowrap rounded-full border border-sand bg-butter px-3 py-1.5 text-[11px] font-medium transition hover:bg-sand"
            >
              {ex}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-2.5 rounded-2xl border border-sand bg-white/60 p-3">
          <LocationRow />
          <TripChips transport={shownTransport} isDefault={!picked && (!preview || preview.transportIsDefault)} />
        </div>

        <div className="mt-6">
          <ModePicker />
        </div>
      </div>

      <div className="relative z-10 border-t border-sand/60 bg-paper px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        {preview && (
          <div className="mb-3">
            <IntentChips intent={preview} />
          </div>
        )}
        <PrimaryButton onClick={submit} disabled={!ready}>
          {cta}
        </PrimaryButton>
      </div>
    </div>
  )
}
