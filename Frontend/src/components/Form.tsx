import { useId, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import { CircleAlert, Eye, EyeOff } from 'lucide-react'
import { useQuest } from '../store/QuestContext'

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | null
  hint?: ReactNode
  icon?: ReactNode
  trailing?: ReactNode
}

/** Labelled input with icon, hint and inline error. */
export function Field({ label, error, hint, icon, trailing, className = '', ...input }: FieldProps) {
  const id = useId()
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-[12px] font-bold text-ink/80">
        {label}
      </label>
      <div
        className={`flex items-center gap-2 rounded-2xl border-2 bg-white px-3 transition focus-within:border-teal ${
          error ? 'border-brick/60' : 'border-sand'
        }`}
      >
        {icon && <span className="shrink-0 text-bark/60">{icon}</span>}
        <input
          id={id}
          {...input}
          aria-invalid={!!error}
          className="min-w-0 flex-1 bg-transparent py-3 text-[15px] placeholder:text-ink/30 focus:outline-none"
        />
        {trailing}
      </div>
      {error ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-brick" role="alert">
          <CircleAlert className="h-3.5 w-3.5" /> {error}
        </p>
      ) : (
        hint && <div className="mt-1 text-[11px] text-bark/70">{hint}</div>
      )}
    </div>
  )
}

/** 0–3: too short / weak / okay / strong. */
export function passwordScore(pw: string): number {
  if (pw.length < 8) return 0
  let s = 1
  if (/[a-z]/.test(pw) && /[A-Z0-9]/.test(pw)) s++
  if (pw.length >= 12 || /[^a-zA-Z0-9]/.test(pw)) s++
  return Math.min(s, 3)
}

export function PasswordField({
  showStrength = false,
  ...props
}: Omit<FieldProps, 'type' | 'trailing'> & { showStrength?: boolean }) {
  const { t } = useQuest()
  const [show, setShow] = useState(false)
  const value = String(props.value ?? '')
  const score = passwordScore(value)
  const colors = ['bg-brick', 'bg-sun-dark', 'bg-teal', 'bg-leaf']
  return (
    <Field
      {...props}
      type={show ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="shrink-0 rounded-full p-1 text-bark/60 hover:bg-black/5"
          aria-label={show ? t.hidePassword : t.showPassword}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      hint={
        showStrength && value ? (
          <div className="flex items-center gap-2">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2].map((i) => (
                <span key={i} className={`h-1 flex-1 rounded-full ${i < score ? colors[score] : 'bg-sand'}`} />
              ))}
            </div>
            <span className="font-bold">{t.pwStrength[score]}</span>
          </div>
        ) : (
          props.hint
        )
      }
    />
  )
}

/** Google "G" in brand colours (drawn inline, no external asset). */
export function GoogleG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  )
}
