import { useState } from 'react'
import { Check, KeyRound, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { PasswordField } from '../components/Form'
import PrimaryButton from '../components/PrimaryButton'
import TopBar from '../components/TopBar'
import { Lotus } from '../components/VnArt'
import { supabase } from '../lib/supabase'
import { useQuest } from '../store/QuestContext'

/** Landing page of the "reset password" email link: the link signs you in, then you set a new password. */
export default function ResetPage() {
  const { t } = useQuest()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle')

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TopBar backTo="/" />
      <div className="px-6">
        <Lotus className="h-10 w-10" />
        <h1 className="mt-2 text-xl font-bold">{t.resetTitle}</h1>
        {state === 'done' ? (
          <div className="mt-4 space-y-4">
            <p className="flex items-center gap-2 rounded-2xl bg-teal/10 p-3 text-[13px] font-medium text-teal">
              <Check className="h-4 w-4" /> {t.passwordSaved}
            </p>
            <PrimaryButton onClick={() => navigate('/')}>{t.planTrip}</PrimaryButton>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <PasswordField
              label={t.newPassword}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              icon={<KeyRound className="h-4 w-4" />}
              showStrength
            />
            {state === 'error' && <p className="text-[12px] font-medium text-brick">{t.authErr.unknown}</p>}
            <PrimaryButton
              disabled={password.length < 8 || state === 'busy'}
              onClick={async () => {
                setState('busy')
                const { error } = (await supabase?.auth.updateUser({ password })) ?? { error: true }
                setState(error ? 'error' : 'done')
              }}
            >
              {state === 'busy' && <Loader2 className="h-4 w-4 animate-spin" />} {t.savePassword}
            </PrimaryButton>
          </div>
        )}
      </div>
    </div>
  )
}
