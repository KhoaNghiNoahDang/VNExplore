import { useCallback, useEffect, useState } from 'react'
import { Check, Download, LocateFixed, Mic, MonitorSmartphone, Share, ShieldCheck, Sparkles } from 'lucide-react'
import { usePwaInstall } from '../lib/pwa'
import { useQuest } from '../store/QuestContext'
import Logo from './Logo'
import PrimaryButton from './PrimaryButton'
import Sheet from './Sheet'

/**
 * What a visit starts with:
 *  1. In a browser tab (not the installed app): "Install VNExplore" — once per visit.
 *  2. Then, if location or the microphone hasn't been decided yet: ask for both — once per visit.
 */
const INSTALL_ASKED = 'vx:install-asked'
const PERMS_ASKED = 'vx:perms-asked'
const MIC_OK = 'vx:mic-granted'

type PermState = 'granted' | 'denied' | 'prompt' | 'asking' | 'unsupported'

const session = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k)
    } catch {
      return null
    }
  },
  set: (k: string) => {
    try {
      sessionStorage.setItem(k, '1')
    } catch {
      /* storage unavailable */
    }
  },
}

const speechSupported = () =>
  typeof window !== 'undefined' && !!((window as unknown as Record<string, unknown>).SpeechRecognition ?? (window as unknown as Record<string, unknown>).webkitSpeechRecognition)

async function queryPermission(name: 'geolocation' | 'microphone'): Promise<PermissionStatus | null> {
  try {
    return await navigator.permissions.query({ name: name as PermissionName })
  } catch {
    return null // not supported (e.g. "microphone" in some Safari / Firefox versions)
  }
}

export default function StartupPrompts() {
  const [step, setStep] = useState<'install' | 'perms' | null>(null)
  const [geo, setGeo] = useState<PermState>('prompt')
  const [mic, setMic] = useState<PermState>(speechSupported() ? 'prompt' : 'unsupported')
  const pwa = usePwaInstall()

  // Read what the browser already knows, and follow changes (e.g. the user answers the prompt).
  useEffect(() => {
    let alive = true
    void queryPermission('geolocation').then((st) => {
      if (!alive || !st) return
      setGeo(st.state as PermState)
      st.onchange = () => setGeo(st.state as PermState)
    })
    if (speechSupported())
      void queryPermission('microphone').then((st) => {
        if (!alive) return
        if (!st) {
          // No permissions API for the mic: remember our own earlier "yes".
          try {
            if (localStorage.getItem(MIC_OK) === '1') setMic('granted')
          } catch {
            /* storage unavailable */
          }
          return
        }
        setMic(st.state as PermState)
        st.onchange = () => setMic(st.state as PermState)
      })
    return () => {
      alive = false
    }
  }, [])

  const needPerms = geo === 'prompt' || mic === 'prompt'
  const nextAfterInstall = useCallback(() => {
    if (needPerms && !session.get(PERMS_ASKED)) {
      session.set(PERMS_ASKED)
      setStep('perms')
    } else setStep(null)
  }, [needPerms])

  // Give the browser a moment to offer its install event and answer the permission queries.
  useEffect(() => {
    const id = setTimeout(() => {
      if (!pwa.standalone && !session.get(INSTALL_ASKED)) {
        session.set(INSTALL_ASKED)
        setStep('install')
      } else nextAfterInstall()
    }, 1500)
    return () => clearTimeout(id)
    // once per visit, on start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (step === 'install') return <InstallSheet onClose={nextAfterInstall} />
  if (step === 'perms') return <PermissionsSheet geo={geo} mic={mic} setGeo={setGeo} setMic={setMic} onClose={() => setStep(null)} />
  return null
}

function InstallSheet({ onClose }: { onClose: () => void }) {
  const { t } = useQuest()
  const pwa = usePwaInstall()
  const steps = t.installSteps[pwa.guide]
  return (
    <Sheet title={t.installTitle} onClose={onClose} closeLabel={t.installLater}>
      <div className="flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-ink bg-cream">
          <Logo className="h-9 w-9" />
        </span>
        <ul className="space-y-1 text-[13px] text-bark">
          {t.installBenefits.map((b) => (
            <li key={b} className="flex items-start gap-1.5">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sun-dark" /> {b}
            </li>
          ))}
        </ul>
      </div>

      {pwa.guide === 'native' ? (
        <PrimaryButton
          className="mt-5"
          onClick={async () => {
            await pwa.install()
            onClose()
          }}
        >
          <Download className="h-4 w-4" /> {t.installBtn}
        </PrimaryButton>
      ) : (
        <div className="mt-5 rounded-2xl border-2 border-sand bg-white p-3">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-bark/60">
            {pwa.guide === 'ios' ? <Share className="h-3.5 w-3.5" /> : <MonitorSmartphone className="h-3.5 w-3.5" />} {t.installHow}
          </div>
          <ol className="space-y-1.5 text-[13px]">
            {steps.map((s, i) => (
              <li key={s} className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal text-[11px] font-bold text-white">{i + 1}</span>
                <span>{s}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      <button onClick={onClose} className="mt-3 w-full py-2 text-center text-[12px] font-bold text-bark/60 hover:text-ink">
        {t.installLater}
      </button>
    </Sheet>
  )
}

function PermissionsSheet({
  geo,
  mic,
  setGeo,
  setMic,
  onClose,
}: {
  geo: PermState
  mic: PermState
  setGeo: (s: PermState) => void
  setMic: (s: PermState) => void
  onClose: () => void
}) {
  const { t, setGeoWanted } = useQuest()

  const askLocation = () => {
    if (!navigator.geolocation) return setGeo('unsupported')
    setGeo('asking')
    // Turn on the app's own tracking too, so the start point and stamping use it right away.
    setGeoWanted(true)
    navigator.geolocation.getCurrentPosition(
      () => setGeo('granted'),
      (e) => setGeo(e.code === e.PERMISSION_DENIED ? 'denied' : 'prompt'),
      { enableHighAccuracy: true, timeout: 15000 },
    )
  }
  const askMic = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return setMic('unsupported')
    setMic('asking')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((tr) => tr.stop()) // only asking — not recording
      setMic('granted')
      try {
        localStorage.setItem(MIC_OK, '1')
      } catch {
        /* storage unavailable */
      }
    } catch {
      setMic('denied')
    }
  }

  const rows = [
    { key: 'geo', icon: LocateFixed, title: t.permLocation, why: t.permLocationWhy, state: geo, ask: askLocation },
    { key: 'mic', icon: Mic, title: t.permMic, why: t.permMicWhy, state: mic, ask: askMic },
  ].filter((r) => r.state !== 'unsupported')

  return (
    <Sheet title={t.permsTitle} onClose={onClose} closeLabel={t.permDone}>
      <p className="text-[13px] text-bark/80">{t.permsIntro}</p>
      <ul className="mt-4 space-y-2">
        {rows.map(({ key, icon: Icon, title, why, state, ask }) => (
          <li key={key} className="flex items-center gap-3 rounded-2xl border-2 border-sand bg-white p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal/10 text-teal">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-bold">{title}</span>
              <span className={`block text-[11px] leading-snug ${state === 'denied' ? 'text-brick' : 'text-bark/70'}`}>
                {state === 'denied' ? t.permDenied : why}
              </span>
            </span>
            {state === 'granted' ? (
              <span className="flex shrink-0 items-center gap-1 text-[12px] font-bold text-leaf">
                <Check className="h-4 w-4" /> {t.permGranted}
              </span>
            ) : state === 'denied' ? null : (
              <button
                onClick={() => void ask()}
                disabled={state === 'asking'}
                className="shrink-0 rounded-xl border-2 border-teal bg-white px-3 py-2 text-[12px] font-bold text-teal transition hover:bg-teal/5 disabled:opacity-60"
              >
                {state === 'asking' ? t.permAsking : t.permAllow}
              </button>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-snug text-bark/65">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal" /> {t.permNote}
      </p>
      <PrimaryButton className="mt-4" onClick={onClose}>
        {t.permDone}
      </PrimaryButton>
    </Sheet>
  )
}
