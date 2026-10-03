// Sign in with "@username + password".
// Supabase Auth only knows email/phone, so this function looks the email up server-side
// (with the service role) and signs in there — the email itself never reaches the browser.
// Every failure returns the same message, so the endpoint can't be used to probe usernames.
import { createClient } from 'npm:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function fail() {
  await new Promise((r) => setTimeout(r, 400)) // slow down guessing
  return json({ error: 'invalid_credentials' }, 401)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  let username = ''
  let password = ''
  // Forwarded to Supabase Auth: required once CAPTCHA protection is turned on.
  let captchaToken: string | undefined
  try {
    const body = await req.json()
    username = String(body.username ?? '').trim().toLowerCase().replace(/^@/, '')
    password = String(body.password ?? '')
    captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : undefined
  } catch {
    return json({ error: 'bad_request' }, 400)
  }
  if (!/^[a-z0-9_.]{3,20}$/.test(username) || password.length < 6 || password.length > 128) return fail()

  const url = Deno.env.get('SUPABASE_URL')!
  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  const { data: profile } = await admin.from('profiles').select('id').eq('username', username).maybeSingle()
  if (!profile) return fail()
  const { data: found } = await admin.auth.admin.getUserById(profile.id)
  const email = found?.user?.email
  if (!email) return fail()

  const anon = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } })
  const { data, error } = await anon.auth.signInWithPassword({ email, password, options: { captchaToken } })
  if (error || !data.session) return fail()

  return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
})
