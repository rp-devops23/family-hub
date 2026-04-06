import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const ok = (body: unknown) => new Response(JSON.stringify(body), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return ok({ error: 'Missing Authorization header' })

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false }
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) return ok({ error: 'Auth failed: ' + (authError?.message ?? 'no user') })

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID')
    if (!clientId) return ok({ error: 'GOOGLE_CLIENT_ID not configured' })

    // The redirect URI must match what's configured in Google Cloud Console
    const redirectUri = `${supabaseUrl}/functions/v1/google-callback`

    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/gmail.readonly',
      'openid',
      'email',
    ].join(' ')

    // Encode user_id in state so the callback knows which user to store tokens for
    const state = btoa(JSON.stringify({ userId: user.id }))

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',   // ensures we get a refresh_token
      prompt: 'select_account consent', // forces account picker + refresh_token
      state,
    })

    const url = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
    return ok({ url })

  } catch (err) {
    console.error('google-auth-url error:', err?.message)
    return ok({ error: 'Unhandled error: ' + (err?.message ?? String(err)) })
  }
})
