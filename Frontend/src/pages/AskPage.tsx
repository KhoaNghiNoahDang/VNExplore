import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowRight, CircleAlert, Lightbulb, Loader2, Mic, Square } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import IntentChips from '../components/IntentChips'
import LocationRow from '../components/LocationRow'
import ModePicker from '../components/ModePicker'
import PrimaryButton from '../components/PrimaryButton'
import TabBar from '../components/TabBar'
import { WeatherPill } from '../components/ContextBits'
import TopBar from '../components/TopBar'
import TripChips from '../components/TripChips'
import { understandRequest } from '../lib/backend'
import { mergeUnderstood, parseIntent, withAreaDefaults } from '../lib/intent'
import { preselect, rankPlaces } from '../lib/quest'
import { useSpeech } from '../lib/useSpeech'
import { useQuest } from '../store/QuestContext'

export default function AskPage() {
  const { t, lang, draft, setDraft, setIntent, planFor, contextFor, mode, transport: picked, setTransport, travel } = useQuest()
  const navigate = useNavigate()
  const speech = useSpeech(lang, draft, setDraft)
  const [needMode, setNeedMode] = useState(false)
  const modeBox = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  const text = draft.trim()
  const parsed = useMemo(() => (text ? parseIntent(text) : null), [text])
  // A new request: the area named in the text, else where the traveller is (not the last saved plan).
  const askArea = planFor(parsed?.area ?? null).area
  const preview = useMemo(() => (parsed ? withAreaDefaults(parsed, askArea) : null), [parsed, askArea])
  const ready = !!preview

  useEffect(() => {
    if (mode) setNeedMode(false)
  }, [mode])

  // Naming a transport in the text replaces one picked by hand earlier.
  const textTransport = preview && !preview.transportIsDefault ? preview.transport : null
  const prevText = useRef(textTransport)
  useEffect(() => {
    if (textTransport && textTransport !== prevText.current) setTransport(null)
    prevText.current = textTransport
  }, [textTransport, setTransport])
  const shownTransport = picked ?? preview?.transport ?? 'walk'

  const [thinking, setThinking] = useState(false)

  const submit = async () => {
    if (thinking) return
    if (speech.listening) speech.stop()
    if (!preview) {
      input.current?.focus()
      return
    }
    if (!mode) {
      // Don't silently block: point at the mode picker.
      setNeedMode(true)
      modeBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    // Let the language model read the request (≤ 4 s); on any problem keep the rule-based reading.
    setThinking(true)
    const merged = mergeUnderstood(preview, await understandRequest(preview.text))
    setThinking(false)
    // Plan inside one area: the one named in the text, else where the traveller is.
    const { area, places: pool, start } = planFor(merged.area)
    const intent = withAreaDefaults(merged, area)
    const transport = picked ?? intent.transport
    const ranked = rankPlaces(pool, intent, start, [], contextFor(area))
    setIntent(intent, preselect(ranked, intent, start, [], { transport, departAt: travel.departAt }))
    // Explore adds one step: choose a role (it then re-picks places that fit the role).
    navigate(mode === 'explore' ? '/role?next=/places&fresh=1' : '/places')
  }

  const cta = !preview ? t.showPlaces : !mode ? t.pickMode : mode === 'explore' ? t.chooseRole : t.showPlaces

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <TopBar />
      <div className="thin-scroll relative z-10 min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        <div className="mb-4 mt-2">
          <div className="mb-1 text-[10px] font-bold tracking-widest text-brick">{t.areaName[askArea]}</div>
          <h1 className="text-[26px] font-bold leading-tight">{t.askTitle}</h1>
          <p className="mt-2 text-[13px] opacity-70">{t.askSub}</p>
          <div className="mt-3">
            <WeatherPill weather={contextFor(askArea).weather ?? null} />
          </div>
        </div>

        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <textarea
            ref={input}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter makes a new line (skip while an IME is composing Vietnamese).
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault()
                submit()
              }
            }}
            placeholder={speech.listening ? t.listening : t.askPlaceholder}
            rows={4}
            enterKeyHint="send"
            className={`h-28 w-full resize-none rounded-2xl border-2 bg-white p-4 pb-12 text-sm leading-relaxed
              placeholder:text-ink/35 focus:outline-none ${speech.listening ? 'border-brick' : 'border-sand focus:border-teal'}`}
            aria-label={t.askTitle}
          />
          <div className="absolute bottom-3 right-3 flex gap-1.5">
            {speech.supported && (
              <button
                type="button"
                onClick={speech.toggle}
                title={speech.listening ? t.stopVoice : t.voice}
                aria-label={speech.listening ? t.stopVoice : t.voice}
                aria-pressed={speech.listening}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md transition active:scale-95 ${
                  speech.listening ? 'listening bg-brick' : 'bg-teal hover:bg-teal/90'
                }`}
              >
                {speech.listening ? <Square className="h-3.5 w-3.5 fill-current" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <button
              type="submit"
              disabled={!ready}
              aria-label={t.send}
              title={t.send}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-sun text-ink shadow-md transition hover:bg-sun-dark active:scale-95 disabled:opacity-40"
            >
              <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
            </button>
          </div>
        </form>

        {speech.listening ? (
          <p className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-brick" role="status">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brick" /> {t.listeningHint}
          </p>
        ) : speech.error ? (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-brick" role="alert">
            <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {t.micError[speech.error]}
          </p>
        ) : (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-bark">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sun-dark" /> {t.transportTip}
          </p>
        )}

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
          <LocationRow area={askArea} />
          <TripChips transport={shownTransport} isDefault={!picked && (!preview || preview.transportIsDefault)} />
        </div>

        <div
          ref={modeBox}
          className={`-mx-2 mt-4 rounded-3xl p-2 transition ${needMode ? 'bg-brick/5 ring-2 ring-brick/40' : ''}`}
        >
          {needMode && (
            <p className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-bold text-brick" role="alert">
              <CircleAlert className="h-4 w-4" /> {t.pickModeHint}
            </p>
          )}
          <ModePicker />
        </div>
      </div>

      <div className="relative z-10 border-t border-sand/60 bg-paper px-6 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-3">
        {preview && (
          <div className="mb-3">
            <IntentChips intent={preview} />
          </div>
        )}
        <PrimaryButton onClick={submit} disabled={!ready || thinking}>
          {thinking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {thinking ? t.thinking : cta}
        </PrimaryButton>
        <TabBar docked />
      </div>
    </div>
  )
}
