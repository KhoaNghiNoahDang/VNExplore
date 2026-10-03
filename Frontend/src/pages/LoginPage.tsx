import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowLeft, AtSign, Check, CircleAlert, KeyRound, Loader2, Mail, Phone, UserRound, X } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useCaptcha } from '../components/Captcha'
import { Field, GoogleG, PasswordField } from '../components/Form'
import PrimaryButton from '../components/PrimaryButton'
import Sheet from '../components/Sheet'
import { DongSonBand, DongSonDrum, LakeScene, Lantern, Lotus } from '../components/VnArt'
import { GOOGLE_AUTH } from '../lib/supabase'
import { normalizePhone, USERNAME_RE, useAuth, type AuthError } from '../store/AuthContext'
import { useQuest } from '../store/QuestContext'

type Tab = 'signin' | 'signup'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Where to go after signing in: ?next=/path (only same-site paths). */
function useNext() {
  const [params] = useSearchParams()
  const next = params.get('next') ?? '/'
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

/**
 * `embedded`: shown inside another page (the Me tab when signed out) — stay on that page after
 * signing in, and leave room for the tab bar.
 */
export default function LoginPage({ embedded = false, after }: { embedded?: boolean; after?: string } = {}) {
  const { t, lang, setLang } = useQuest()
  const auth = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromQuery = useNext()
  const next = after ?? fromQuery
  // Back = the page before this one. Never jump to `next`: pages that need an account
  // (Me, Create…) would send a signed-out traveller straight back here, with no way out.
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate('/', { replace: true })
  }
  const [tab, setTab] = useState<Tab>(params.get('tab') === 'signup' ? 'signup' : 'signin')

  // Signed in (also right after a Google redirect) → go back where we came from. A guest stays:
  // they came here to sign in to a real account (what they did as a guest is moved into it).
  useEffect(() => {
    if (auth.session && !auth.isGuest) navigate(next, { replace: true })
  }, [auth.session, auth.isGuest, navigate, next])

  return (
    <div className="thin-scroll relative flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
      {/* Illustrated header */}
      <div className="relative h-44 shrink-0 overflow-hidden">
        <LakeScene className="absolute inset-0 h-full w-full" />
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <button
            onClick={back}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/85 shadow-sm backdrop-blur hover:bg-white"
            aria-label={t.back}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex gap-1 rounded-full bg-white/85 px-2 py-1 text-xs font-bold shadow-sm backdrop-blur">
            {(['en', 'vi'] as const).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={lang === l ? 'px-1 underline underline-offset-4' : 'px-1 opacity-40'}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Card overlapping the illustration */}
      <div className={`relative -mt-6 flex-1 rounded-t-[28px] bg-paper px-6 pt-6 ${embedded ? 'pb-32' : 'pb-[max(1.5rem,env(safe-area-inset-bottom))]'}`}>
        <DongSonDrum className="pointer-events-none absolute -right-20 top-40 h-56 w-56 text-sand/50" />
        <div className="relative">
          <div className="flex items-center gap-2">
            <Lotus className="h-6 w-6" />
            <h1 className="text-[22px] font-bold leading-tight">{tab === 'signin' ? t.authWelcome : t.authJoin}</h1>
          </div>
          <p className="mt-1 text-[13px] text-bark/80">{t.authSub}</p>
          {auth.isGuest && (
            <p className="mt-3 rounded-2xl bg-sun/20 px-3 py-2.5 text-[12px] font-medium text-bark">{t.guestMergeNote}</p>
          )}

          {/* Tabs */}
          <div className="mt-5 grid grid-cols-2 rounded-2xl bg-butter/70 p-1" role="tablist">
            {(['signin', 'signup'] as Tab[]).map((k) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`rounded-xl py-2.5 text-sm font-bold transition ${tab === k ? 'bg-white shadow-sm' : 'text-bark/70 hover:text-ink'}`}
              >
                {k === 'signin' ? t.signIn : t.signUp}
              </button>
            ))}
          </div>

          <div className="mt-5">{tab === 'signin' ? <SignInForm /> : <SignUpForm />}</div>

          {/* Divider + Google */}
          <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-widest text-bark/50">
            <DongSonBand className="h-2 flex-1 text-sand" />
            {t.orWith}
            <DongSonBand className="h-2 flex-1 text-sand" />
          </div>
          <GoogleButton next={next} />

          <p className="mt-5 text-center text-[13px] text-bark/80">
            {tab === 'signin' ? t.noAccount : t.haveAccount}{' '}
            <button onClick={() => setTab(tab === 'signin' ? 'signup' : 'signin')} className="font-bold text-teal underline underline-offset-2">
              {tab === 'signin' ? t.signUp : t.signIn}
            </button>
          </p>
          <div className="mt-4 flex justify-center gap-6 opacity-70">
            <Lantern className="h-8 w-5" />
            <Lantern className="h-10 w-6" />
            <Lantern className="h-8 w-5" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ErrorBox({ error }: { error: AuthError | null }) {
  const { t } = useQuest()
  if (!error) return null
  const ok = error === 'confirm_email_sent'
  return (
    <div
      role={ok ? 'status' : 'alert'}
      className={`flex items-start gap-2 rounded-2xl px-3 py-2.5 text-[13px] font-medium ${ok ? 'bg-teal/10 text-teal' : 'bg-brick/10 text-brick'}`}
    >
      {ok ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />}
      {t.authErr[error]}
    </div>
  )
}

// ------------------------------------------------------------ sign in
function SignInForm() {
  const { t, lang } = useQuest()
  const { signIn } = useAuth()
  const captcha = useCaptcha(lang)
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [touched, setTouched] = useState(false)
  const [resetOpen, setResetOpen] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!identifier.trim() || !password) return
    setBusy(true)
    setError(await signIn(identifier, password, captcha.token))
    captcha.reset()
    setBusy(false)
  }

  const idIcon = identifier.includes('@') && !identifier.startsWith('@') ? (
    <Mail className="h-4 w-4" />
  ) : normalizePhone(identifier) ? (
    <Phone className="h-4 w-4" />
  ) : (
    <AtSign className="h-4 w-4" />
  )

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field
        label={t.identifier}
        placeholder={t.identifierPh}
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        autoComplete="username"
        autoCapitalize="none"
        icon={idIcon}
        error={touched && !identifier.trim() ? t.errRequired : null}
      />
      <div>
        <PasswordField
          label={t.password}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          icon={<KeyRound className="h-4 w-4" />}
          error={touched && !password ? t.errRequired : null}
        />
        <div className="mt-1.5 text-right">
          <button type="button" onClick={() => setResetOpen(true)} className="text-[12px] font-bold text-teal hover:underline">
            {t.forgotPassword}
          </button>
        </div>
      </div>
      <ErrorBox error={error} />
      {captcha.widget}
      <PrimaryButton type="submit" disabled={busy || !captcha.ready}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.signIn}
      </PrimaryButton>
      {resetOpen && <ResetSheet onClose={() => setResetOpen(false)} />}
    </form>
  )
}

function ResetSheet({ onClose }: { onClose: () => void }) {
  const { t, lang } = useQuest()
  const { sendPasswordReset } = useAuth()
  const captcha = useCaptcha(lang)
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'sent'>('idle')
  const [error, setError] = useState<AuthError | null>(null)
  const valid = EMAIL_RE.test(email.trim())
  return (
    <Sheet title={t.resetTitle} onClose={onClose}>
      {state === 'sent' ? (
        <p className="flex items-start gap-2 rounded-2xl bg-teal/10 p-3 text-[13px] font-medium text-teal">
          <Check className="mt-0.5 h-4 w-4 shrink-0" /> {t.resetSent}
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-[13px] text-bark/80">{t.resetSub}</p>
          <Field label={t.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail className="h-4 w-4" />} />
          <ErrorBox error={error} />
          {captcha.widget}
          <PrimaryButton
            disabled={!valid || state === 'busy' || !captcha.ready}
            onClick={async () => {
              setState('busy')
              const err = await sendPasswordReset(email, captcha.token)
              captcha.reset()
              setError(err)
              setState(err ? 'idle' : 'sent')
            }}
          >
            {t.resetSend}
          </PrimaryButton>
          <p className="text-[11px] text-bark/60">{t.resetPhoneNote}</p>
        </div>
      )}
    </Sheet>
  )
}

// ------------------------------------------------------------ sign up
function SignUpForm() {
  const { t, lang } = useQuest()
  const { signUp, isUsernameFree } = useAuth()
  const captcha = useCaptcha(lang)
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [by, setBy] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [agree, setAgree] = useState(false)
  const [touched, setTouched] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [otpOpen, setOtpOpen] = useState(false)
  const [free, setFree] = useState<boolean | null>(null)

  // Live "is this @name free?" check, debounced.
  const uname = username.trim().toLowerCase().replace(/^@/, '')
  useEffect(() => {
    setFree(null)
    if (!USERNAME_RE.test(uname)) return
    const id = setTimeout(() => isUsernameFree(uname).then(setFree), 400)
    return () => clearTimeout(id)
  }, [uname, isUsernameFree])

  const errors = {
    name: !name.trim() ? t.errRequired : null,
    username: !uname ? t.errRequired : !USERNAME_RE.test(uname) ? t.errUsername : free === false ? t.usernameTaken : null,
    contact:
      by === 'email'
        ? !email.trim() ? t.errRequired : !EMAIL_RE.test(email.trim()) ? t.errEmail : null
        : !phone.trim() ? t.errRequired : !normalizePhone(phone) ? t.errPhone : null,
    password: password.length < 8 ? t.authErr.weak_password : null,
    password2: password2 !== password ? t.errPwMatch : null,
    agree: !agree ? t.errTerms : null,
  }
  const show = (k: keyof typeof errors) => (touched ? errors[k] : null)
  const valid = Object.values(errors).every((x) => !x)

  const create = async () => {
    setBusy(true)
    setError(
      await signUp({
        displayName: name,
        username: uname,
        password,
        captchaToken: captcha.token,
        ...(by === 'email' ? { email } : { phone }),
      }),
    )
    captcha.reset()
    setBusy(false)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!valid) return
    if (by === 'phone') setOtpOpen(true) // DEMO: fake SMS step
    else await create()
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <Field
        label={t.displayName}
        placeholder={t.displayNamePh}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        icon={<UserRound className="h-4 w-4" />}
        error={show('name')}
      />
      <Field
        label={t.username}
        placeholder="minhanh"
        value={username}
        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ''))}
        autoCapitalize="none"
        autoComplete="off"
        icon={<AtSign className="h-4 w-4" />}
        trailing={
          USERNAME_RE.test(uname) && free !== null ? (
            <span className={`flex shrink-0 items-center gap-1 text-[11px] font-bold ${free ? 'text-leaf' : 'text-brick'}`}>
              {free ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
              {free ? t.usernameFree : t.usernameTaken}
            </span>
          ) : null
        }
        hint={t.usernameHint}
        error={show('username')}
      />

      <div>
        <div className="mb-1 text-[12px] font-bold text-ink/80">{t.contactBy}</div>
        <div className="mb-2 grid grid-cols-2 gap-2">
          {(['email', 'phone'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setBy(k)}
              aria-pressed={by === k}
              className={`flex items-center justify-center gap-1.5 rounded-xl border-2 py-2 text-[13px] font-bold transition ${
                by === k ? 'border-teal bg-teal/10 text-teal' : 'border-sand bg-white text-bark/70'
              }`}
            >
              {k === 'email' ? <Mail className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              {k === 'email' ? t.email : t.phone}
            </button>
          ))}
        </div>
        {by === 'email' ? (
          <Field label={t.email} type="email" placeholder="ban@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" icon={<Mail className="h-4 w-4" />} error={show('contact')} />
        ) : (
          <Field label={t.phone} type="tel" inputMode="tel" placeholder={t.phonePh} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" icon={<span className="text-[13px] font-bold">🇻🇳</span>} error={show('contact')} />
        )}
      </div>

      <PasswordField
        label={t.password}
        placeholder={t.passwordPh}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
        icon={<KeyRound className="h-4 w-4" />}
        showStrength
        error={show('password')}
      />
      <PasswordField
        label={t.confirmPassword}
        value={password2}
        onChange={(e) => setPassword2(e.target.value)}
        autoComplete="new-password"
        icon={<KeyRound className="h-4 w-4" />}
        error={show('password2')}
      />

      <label className="flex cursor-pointer items-start gap-2.5 text-[13px]">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 accent-teal" />
        <span>
          {t.agreeTerms}
          {show('agree') && <span className="block text-[11px] font-medium text-brick">{errors.agree}</span>}
        </span>
      </label>

      <ErrorBox error={error} />
      {captcha.widget}
      <PrimaryButton type="submit" disabled={busy || !captcha.ready}>
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} {by === 'phone' ? t.sendCode : t.createAccount}
      </PrimaryButton>

      {otpOpen && (
        <OtpSheet
          phone={phone}
          busy={busy}
          error={error}
          onClose={() => setOtpOpen(false)}
          onVerify={create}
        />
      )}
    </form>
  )
}

/**
 * DEMO SMS step: no message is really sent and any 6 digits are accepted.
 * Replace with Supabase phone OTP when an SMS provider is configured (PHONE_VERIFY = 'sms').
 */
function OtpSheet({
  phone,
  busy,
  error,
  onClose,
  onVerify,
}: {
  phone: string
  busy: boolean
  error: AuthError | null
  onClose: () => void
  onVerify: () => void
}) {
  const { t } = useQuest()
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const boxes = useRef<(HTMLInputElement | null)[]>([])
  const full = code.every((c) => /^\d$/.test(c))

  const setAt = (i: number, v: string) => {
    const digits = v.replace(/\D/g, '')
    if (digits.length > 1) {
      // pasted a whole code
      const next = digits.slice(0, 6).split('')
      setCode((c) => c.map((_, k) => next[k] ?? ''))
      boxes.current[Math.min(next.length, 5)]?.focus()
      return
    }
    setCode((c) => c.map((x, k) => (k === i ? digits : x)))
    if (digits && i < 5) boxes.current[i + 1]?.focus()
  }

  return (
    <Sheet title={t.otpTitle} onClose={onClose}>
      <p className="text-[13px] text-bark/80">{t.otpSent(phone)}</p>
      <div className="my-4 flex justify-between gap-2">
        {code.map((c, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el
            }}
            value={c}
            onChange={(e) => setAt(i, e.target.value)}
            onKeyDown={(e) => e.key === 'Backspace' && !c && i > 0 && boxes.current[i - 1]?.focus()}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={6}
            autoFocus={i === 0}
            aria-label={`${i + 1}`}
            className="h-12 w-11 rounded-xl border-2 border-sand bg-white text-center text-lg font-bold focus:border-teal focus:outline-none"
          />
        ))}
      </div>
      <p className="mb-3 rounded-xl bg-sun/20 px-3 py-2 text-[11px] font-medium text-bark">{t.otpDemo}</p>
      <ErrorBox error={error} />
      <div className="mt-3">
        <PrimaryButton disabled={!full || busy} onClick={onVerify}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} {t.verify}
        </PrimaryButton>
      </div>
      <button onClick={onClose} className="mt-3 w-full text-center text-[12px] font-bold text-teal">
        {t.changeNumber}
      </button>
    </Sheet>
  )
}

function GoogleButton({ next }: { next: string }) {
  const { t } = useQuest()
  const { signInWithGoogle } = useAuth()
  const [note, setNote] = useState<string | null>(null)
  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (!GOOGLE_AUTH) return setNote(t.googleSoon)
          const err = await signInWithGoogle(next)
          if (err) setNote(t.authErr[err])
        }}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-sand bg-white py-3.5 text-[15px] font-bold text-ink shadow-sm transition hover:border-bark/30 hover:bg-cream active:scale-[.99]"
      >
        <GoogleG className="h-5 w-5" /> {t.continueGoogle}
      </button>
      {note && <p className="mt-2 text-center text-[12px] text-bark/70">{note}</p>}
    </>
  )
}
