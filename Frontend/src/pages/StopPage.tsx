import { useEffect, useMemo, useState } from 'react'
import {
  Award,
  BookOpen,
  Camera,
  ChevronDown,
  CircleCheck,
  Clock3,
  Gift,
  Handshake,
  Headphones,
  Lightbulb,
  LocateFixed,
  Lock,
  MapPin,
  Navigation,
  Pause,
  Star,
  Volume2,
  Wallet,
} from 'lucide-react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { ROLE_ICON, TONE_BG } from '../components/icons'
import { MapStopCard } from '../components/MapCards'
import MapView, { type MapPanel } from '../components/MapView'
import PlaceThumb from '../components/PlaceThumb'
import PlaceReportPrompt from '../components/PlaceReportPrompt'
import PrimaryButton from '../components/PrimaryButton'
import Stamp from '../components/Stamp'
import { LegLine } from '../components/TravelBits'
import TopBar from '../components/TopBar'
import { missionFor } from '../data/roles'
import { distance, minutes, moneyRange } from '../lib/format'
import { formatOpeningHours } from '../lib/hours'
import { googleMapsUrl, quizOf, shuffledOrder, storyOf } from '../lib/quest'
import { distanceM, estimateLeg } from '../lib/travel'
import { useNarration } from '../lib/useNarration'
import { useQuest } from '../store/QuestContext'
import type { Lang, Place, Role } from '../types'

export default function StopPage() {
  const { step } = useParams()
  const { journey, places, intent, mode, role } = useQuest()

  const stops = useMemo(
    () => (journey ? journey.stopIds.map((id) => places.find((p) => p.id === id)).filter((p): p is Place => !!p) : []),
    [journey, places],
  )
  const i = Number(step)

  if (!journey || !intent || !mode) return <Navigate to="/" replace />
  if (!stops.length) return null // places still loading
  if (!Number.isInteger(i) || i < 0 || i >= stops.length) return <Navigate to="/go/0" replace />
  if (mode === 'explore' && !role) return <Navigate to={`/role?next=/go/${i}&back=/`} replace />

  // `key` resets local state (skipped mission, open story…) when moving to another stop.
  return <Stop key={stops[i].id} stops={stops} index={i} />
}

function Stop({ stops, index }: { stops: Place[]; index: number }) {
  const { t, lang, journey, intent, mode, role, start, arrive, completeMission, travel, geo, setGeoWanted } = useQuest()
  const navigate = useNavigate()
  const narration = useNarration()
  const [skippedMission, setSkippedMission] = useState(false)
  const [storyOpen, setStoryOpen] = useState(false)

  const place = stops[index]
  const arrivedMode = journey!.arrived[place.id]
  const arrived = !!arrivedMode
  const hasItem = journey!.items.includes(place.id)
  // A stop has a mission if we're in Explore now and didn't already arrive here in another mode.
  const missionActive = mode === 'explore' && !!role && (!arrived || arrivedMode === 'explore')
  const mission = role ? missionFor(role, place.id) : null
  const storyUnlocked = !missionActive || hasItem || skippedMission
  const isLast = index === stops.length - 1
  const prev = index === 0 ? (journey!.start ?? start) : stops[index - 1]
  const people = intent!.people
  const leg = useMemo(
    () => estimateLeg(prev, place, travel.transport, new Date(), people),
    [prev, place, travel.transport, people],
  )
  const here = geo.status === 'on' && geo.position ? geo.position : null
  // distanceM() pads for street detours; undo that for "how far am I, as the crow flies".
  const crowM = here ? distanceM(here, place) / 1.3 : null
  // Transport actually used on every leg of the journey (some are forced to walk).
  const journeyStart = journey!.start ?? start
  const legModes = useMemo(
    () =>
      stops.map(
        (s, k) => estimateLeg(k === 0 ? journeyStart : stops[k - 1], s, travel.transport, new Date(), people).transport,
      ),
    [stops, journeyStart, travel.transport, people],
  )
  // Frame this leg (and the traveller) rather than the whole route.
  const legPoints = useMemo(() => [prev, place, ...(here ? [here] : [])], [prev, place, here])

  const onArrive = () => {
    arrive(place.id)
    // Listen mode: the story plays by itself on arrival (inside the tap, so browsers allow audio).
    if (mode === 'listen') narration.play(storyOf(place, lang), lang)
  }

  // Auto-stamp when the phone says we're there (reasonably accurate fix, within ~50 m).
  useEffect(() => {
    if (!arrived && crowM !== null && crowM <= 50 && (geo.accuracyM ?? 999) <= 100) onArrive()
  }, [arrived, crowM])

  const next = () => {
    narration.stop()
    navigate(isLast ? '/finish' : `/go/${index + 1}`)
  }

  const mapPanel: MapPanel = {
    title: `${t.stopOf(index + 1, stops.length)} · ${place.name[lang]}`,
    summary: (
      <div className="space-y-1">
        <LegLine leg={leg} people={people} />
        {crowM !== null && (
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-teal">
            <LocateFixed className="h-3.5 w-3.5" /> {t.distanceLeft(distance(crowM))}
          </div>
        )}
      </div>
    ),
    items: stops.map((s, k) => ({
      id: s.id,
      render: () => (
        <MapStopCard place={s} index={k} people={people} done={!!journey!.arrived[s.id]} current={k === index} />
      ),
    })),
    action: arrived ? (
      <PrimaryButton onClick={next}>{isLast ? t.finishJourney : t.nextStop}</PrimaryButton>
    ) : (
      <div className="flex gap-2">
        <a
          href={googleMapsUrl(here ?? prev, [place], leg.transport)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border-2 border-ink bg-white px-4 text-xs font-bold hover:bg-ink/5"
        >
          <Navigation className="h-4 w-4" /> {t.directions}
        </a>
        <PrimaryButton onClick={onArrive}>
          <MapPin className="h-4 w-4" /> {t.imHere}
        </PrimaryButton>
      </div>
    ),
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/quest" showMode />

      <div className="px-6 pb-2">
        <div className="flex items-center justify-between text-[11px] font-bold">
          <span className="text-brick">{t.stopOf(index + 1, stops.length)}</span>
          {mode === 'explore' && role && (
            <span className="flex items-center gap-1 text-bark">
              <Gift className="h-3 w-3" />
              {t.itemsProgress(journey!.items.length, stops.length, role.itemNoun[lang])}
            </span>
          )}
        </div>
        <div className="mt-2 flex gap-1">
          {stops.map((s, k) => (
            <div
              key={s.id}
              className={`h-1.5 flex-1 rounded-full ${
                journey!.arrived[s.id] ? 'bg-teal' : k === index ? 'bg-sun' : 'bg-sand'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="thin-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-6 pb-4 pt-2">
        <MapView
          start={journey!.start ?? start}
          places={stops}
          route={stops}
          focusedId={place.id}
          height={170}
          userPos={here}
          fitPoints={legPoints}
          panel={mapPanel}
          legModes={legModes}
        />

        <div className="flex items-center gap-3">
          <PlaceThumb place={place} className="h-16 w-16" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold leading-tight">{place.name[lang]}</h1>
            {lang === 'en' && <p className="text-[11px] opacity-60">{place.nameVi}</p>}
            <p className="mt-0.5 text-[11px] font-medium">
              {minutes(place.visitMin, lang)} · {moneyRange(place.priceMin * people, place.priceMax * people, lang)} {place.priceMax > 0 && t.forN(people)}
            </p>
          </div>
        </div>

        {!arrived ? (
          <>
            {missionActive && mission && role && <MissionBubble role={role} task={mission.task[lang]} item={mission.item[lang]} lang={lang} />}
            {mode === 'listen' && (
              <div className="flex items-center gap-2 rounded-2xl bg-teal/10 p-3 text-[12px] font-medium text-teal">
                <Headphones className="h-4 w-4 shrink-0" /> {t.autoPlayNote}
              </div>
            )}
            {mode === 'easy' && <InfoGrid place={place} people={people} lang={lang} only={['price', 'hours', 'photo']} />}
            <div className="rounded-2xl border-2 border-sand bg-white p-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest opacity-50">{t.thisLeg}</div>
              <LegLine leg={leg} people={people} />
              <div className="mt-2 border-t border-sand pt-2 text-[11px]">
                {crowM !== null ? (
                  <span className="flex items-center gap-1.5 font-bold text-teal">
                    <LocateFixed className="h-3.5 w-3.5" /> {t.distanceLeft(distance(crowM))}
                    <span className="font-medium opacity-70">· {t.autoStamp}</span>
                  </span>
                ) : (
                  <button onClick={() => setGeoWanted(true)} className="flex items-center gap-1.5 font-bold text-teal">
                    <LocateFixed className="h-3.5 w-3.5" /> {t.turnOnLocation}
                  </button>
                )}
              </div>
            </div>
            <a
              href={googleMapsUrl(here ?? prev, [place], leg.transport)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl border-2 border-ink py-3 text-xs font-bold hover:bg-ink/5"
            >
              <Navigation className="h-4 w-4" /> {t.directions}
            </a>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4 rounded-2xl border-2 border-sand bg-white p-3">
              <Stamp place={place} index={index} gold={hasItem} size="sm" />
              <div className="flex-1">
                <div className="flex items-center gap-1 text-sm font-bold text-teal">
                  <CircleCheck className="h-4 w-4" /> {t.stamped}
                </div>
                {hasItem && mission && (
                  <div className="mt-1 text-[11px]">
                    <span className="flex items-center gap-1 font-bold text-bark">
                      <Award className="h-3.5 w-3.5 text-sun-dark" /> {t.goldSeal}
                    </span>
                    <span className="flex items-center gap-1 opacity-80">
                      <Gift className="h-3 w-3" /> {mission.item[lang]}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {missionActive && !hasItem && !skippedMission && mission &&
              (quizOf(place).length ? (
                <Quiz place={place} lang={lang} onDone={() => completeMission(place.id)} onSkip={() => setSkippedMission(true)} />
              ) : (
                // Quick places have no quiz: the traveller confirms they did the mission.
                <div className="flex gap-2">
                  <button
                    onClick={() => setSkippedMission(true)}
                    className="shrink-0 rounded-2xl border-2 border-sand px-4 text-[12px] font-bold opacity-70 hover:opacity-100"
                  >
                    {t.skipMission}
                  </button>
                  <PrimaryButton className="flex-1" onClick={() => completeMission(place.id)}>
                    <CircleCheck className="h-4 w-4" /> {t.missionDoneBtn}
                  </PrimaryButton>
                </div>
              ))}

            {mode === 'easy' ? (
              <div className="rounded-2xl border-2 border-sand bg-white">
                <button
                  onClick={() => setStoryOpen((o) => !o)}
                  className="flex w-full items-center justify-between p-4 text-left text-sm font-bold"
                  aria-expanded={storyOpen}
                >
                  <span className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" /> {storyOpen ? t.hideStory : t.readStory}
                  </span>
                  <ChevronDown className={`h-4 w-4 transition ${storyOpen ? 'rotate-180' : ''}`} />
                </button>
                {storyOpen && (
                  <div className="px-4 pb-4">
                    <StoryText place={place} lang={lang} narration={narration} />
                  </div>
                )}
              </div>
            ) : storyUnlocked ? (
              <div className="rounded-2xl border-2 border-sand bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-bold">
                  <BookOpen className="h-4 w-4" /> {place.story[lang] ? t.realStory : t.aboutPlace}
                </div>
                <StoryText place={place} lang={lang} narration={narration} />
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-sand p-4 text-[12px] opacity-70">
                <Lock className="h-4 w-4 shrink-0" /> {t.storyLocked}
              </div>
            )}

            {storyUnlocked && <InfoGrid place={place} people={people} lang={lang} />}
            {!(missionActive && !hasItem && !skippedMission && mission) && <QuizPanel place={place} lang={lang} />}
            <PlaceReportPrompt place={place} journeyStartedAt={journey!.startedAt} />
          </>
        )}
      </div>

      <div className="border-t border-sand/60 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
        {arrived ? (
          <PrimaryButton onClick={next}>{isLast ? t.finishJourney : t.nextStop}</PrimaryButton>
        ) : (
          <>
            <PrimaryButton onClick={onArrive}>
              <MapPin className="h-4 w-4" /> {t.imHere}
            </PrimaryButton>
            <button onClick={next} className="mt-2 w-full text-center text-[11px] font-bold opacity-50 hover:opacity-80">
              {t.skipStop}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function MissionBubble({ role, task, item, lang }: { role: Role; task: string; item: string; lang: Lang }) {
  const { t } = useQuest()
  const Icon = ROLE_ICON[role.id]
  return (
    <div className="flex items-start gap-3">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${TONE_BG[role.tone]}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 rounded-2xl rounded-tl-sm border-2 border-brick/20 bg-brick/5 p-3">
        <div className="text-[10px] font-bold uppercase tracking-wider text-brick">{t.missionFrom(role.name[lang])}</div>
        <p className="mt-1 text-[13px] leading-snug">{task}</p>
        <div className="mt-2 text-[10px] font-bold uppercase tracking-wider opacity-50">{t.reward}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-bold text-bark">
          <span className="flex items-center gap-1">
            <Gift className="h-3.5 w-3.5" /> {item}
          </span>
          <span className="flex items-center gap-1">
            <Award className="h-3.5 w-3.5 text-sun-dark" /> {t.goldSeal}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * A short quiz at a stop: one question at a time, a hint after a wrong try, then the right answer
 * with why it is right. Ends with a first-try score. In Explore mode finishing earns the role's item.
 */
function Quiz({
  place,
  lang,
  onDone,
  onSkip,
  doneLabel,
}: {
  place: Place
  lang: Lang
  /** Called from the score screen; omitted = the score screen is the end. */
  onDone?: () => void
  onSkip?: () => void
  doneLabel?: string
}) {
  const { t } = useQuest()
  const questions = useMemo(() => quizOf(place), [place])
  const [step, setStep] = useState(0)
  const [wrong, setWrong] = useState<number[]>([])
  const [solved, setSolved] = useState(false)
  const [score, setScore] = useState(0)
  const n = questions.length
  const finished = step >= n
  const q = questions[Math.min(step, n - 1)]
  const order = useMemo(() => shuffledOrder(q.options.length, `${place.id}#${step}`), [q, place.id, step])

  const pick = (k: number) => {
    if (solved) return
    if (k !== q.answer) return setWrong((w) => [...w, k])
    setSolved(true)
    if (!wrong.length) setScore((s) => s + 1)
  }
  const next = () => {
    setStep((i) => i + 1)
    setWrong([])
    setSolved(false)
  }

  if (finished) {
    return (
      <div className="rounded-2xl border-2 border-ink bg-white p-4 text-center">
        <div className="text-[10px] font-bold uppercase tracking-widest text-brick">{t.openQuiz(n)}</div>
        <div className="mt-2 flex justify-center gap-1" aria-hidden>
          {questions.map((_, i) => (
            <Star key={i} className={`h-5 w-5 ${i < score ? 'fill-sun text-sun-dark' : 'text-sand'}`} />
          ))}
        </div>
        <p className="mt-2 text-sm font-bold">{t.quizScore(score, n)}</p>
        <p className="mt-0.5 text-[12px] opacity-70">{t.quizCheer(score, n)}</p>
        {onDone && (
          <PrimaryButton className="mt-3" onClick={onDone}>
            <Gift className="h-4 w-4" /> {doneLabel ?? t.claimReward}
          </PrimaryButton>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-white p-4">
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-widest">
        <span className="text-brick">{q.kind ? t.quizKind[q.kind] : t.challengeTitle}</span>
        {n > 1 && <span className="opacity-50">{t.questionOf(step + 1, n)}</span>}
      </div>
      <p className="mt-1 text-sm font-bold leading-snug">{q.prompt[lang]}</p>
      <div className="mt-3 space-y-2">
        {order.map((k) => {
          const isWrong = wrong.includes(k)
          const isRight = solved && k === q.answer
          return (
            <button
              key={k}
              disabled={isWrong || solved}
              onClick={() => pick(k)}
              className={`flex w-full items-center gap-2 rounded-xl border-2 px-3 py-2.5 text-left text-[13px] font-medium transition ${
                isRight
                  ? 'border-teal bg-teal/10 font-bold text-teal'
                  : isWrong
                    ? 'border-brick/30 bg-brick/5 line-through opacity-50'
                    : solved
                      ? 'border-sand opacity-50'
                      : 'border-sand hover:border-ink'
              }`}
            >
              {isRight && <CircleCheck className="h-4 w-4 shrink-0" />}
              {q.options[k][lang]}
            </button>
          )
        })}
      </div>
      {!solved && wrong.length > 0 && (
        <p className="mt-3 flex items-start gap-1.5 text-[12px] text-brick">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            {t.wrong} <b>{t.hint}:</b> {q.hint[lang]}
          </span>
        </p>
      )}
      {solved && (
        <div className="mt-3 rounded-xl bg-teal/10 p-3 text-[12px] leading-snug">
          <div className="font-bold text-teal">{wrong.length ? t.whyAnswer : t.correct}</div>
          {q.explain && <p className="mt-1">{q.explain[lang]}</p>}
          <PrimaryButton className="mt-3" onClick={next}>
            {step + 1 < n ? t.nextQuestion : t.seeScore}
          </PrimaryButton>
        </div>
      )}
      {onSkip && !solved && (
        <button onClick={onSkip} className="mt-3 text-[11px] font-bold opacity-50 hover:opacity-80">
          {t.skipMission}
        </button>
      )}
    </div>
  )
}

/** The quiz outside an Explore mission: optional, folded until opened. */
function QuizPanel({ place, lang }: { place: Place; lang: Lang }) {
  const { t } = useQuest()
  const [open, setOpen] = useState(false)
  const n = quizOf(place).length
  if (!n) return null
  return open ? (
    <Quiz place={place} lang={lang} />
  ) : (
    <button
      onClick={() => setOpen(true)}
      className="flex w-full items-center justify-between rounded-2xl border-2 border-sand bg-white p-4 text-left text-sm font-bold"
    >
      <span className="flex items-center gap-2">
        <Lightbulb className="h-4 w-4 text-brick" /> {t.openQuiz(n)}
      </span>
      <ChevronDown className="h-4 w-4" />
    </button>
  )
}

function StoryText({
  place,
  lang,
  narration,
}: {
  place: Place
  lang: Lang
  narration: ReturnType<typeof useNarration>
}) {
  const { t } = useQuest()
  return (
    <>
      <p className="text-[13px] leading-relaxed">{storyOf(place, lang)}</p>
      {narration.supported && (
        <button
          onClick={() => (narration.speaking ? narration.stop() : narration.play(storyOf(place, lang), lang))}
          className="mt-3 flex items-center gap-2 rounded-full bg-teal px-4 py-2 text-xs font-bold text-white"
        >
          {narration.speaking ? <Pause className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {narration.speaking ? t.pause : t.listen}
        </button>
      )}
    </>
  )
}

type InfoKey = 'why' | 'price' | 'hours' | 'photo' | 'etiquette'

function InfoGrid({ place, people, lang, only }: { place: Place; people: number; lang: Lang; only?: InfoKey[] }) {
  const { t } = useQuest()
  const perPerson = moneyRange(place.priceMin, place.priceMax, lang)
  const checked = place.priceCheckedOn
    ? new Intl.DateTimeFormat(lang === 'vi' ? 'vi-VN' : 'en', { month: 'short', year: 'numeric' }).format(new Date(place.priceCheckedOn))
    : ''
  const rows: { key: InfoKey; icon: typeof Lightbulb; title: string; body: string }[] = [
    { key: 'why', icon: Lightbulb, title: t.why, body: place.why[lang] },
    {
      key: 'price',
      icon: Wallet,
      title: t.priceRef,
      body:
        place.priceMax === 0
          ? perPerson
          : `${perPerson}${t.perPerson} · ${moneyRange(place.priceMin * people, place.priceMax * people, lang)} ${t.forN(people)}` +
            (checked ? ` · ${t.priceChecked(checked)}` : ''),
    },
    { key: 'hours', icon: Clock3, title: t.openingHours, body: formatOpeningHours(place.openingHours, lang) },
    { key: 'photo', icon: Camera, title: t.photoAngle, body: place.photoTip[lang] },
    { key: 'etiquette', icon: Handshake, title: t.etiquette, body: place.etiquette[lang] },
  ]
  return (
    <div className="divide-y divide-sand rounded-2xl border-2 border-sand bg-white">
      {rows
        .filter((r) => (!only || only.includes(r.key)) && r.body)
        .map(({ key, icon: Icon, title, body }) => (
          <div key={key} className="flex gap-3 p-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-brick" />
            <div>
              <div className="text-[11px] font-bold">{title}</div>
              <p className="text-[12px] leading-snug opacity-80">{body}</p>
            </div>
          </div>
        ))}
    </div>
  )
}
