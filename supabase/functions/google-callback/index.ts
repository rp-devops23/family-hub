import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!

  // Determine app origin for redirect (Vercel URL or fallback)
  const appOrigin = Deno.env.get('APP_ORIGIN') ?? 'https://familyhub.vercel.app'

  const redirectError = (msg: string) => {
    const url = `${appOrigin}/auth/google/callback?error=${encodeURIComponent(msg)}`
    return Response.redirect(url, 302)
  }

  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) return redirectError(error)
    if (!code || !state) return redirectError('Missing code or state')

    // Decode state to get user_id
    let userId: string
    try {
      const decoded = JSON.parse(atob(state))
      userId = decoded.userId
      if (!userId) throw new Error('no userId')
    } catch {
      return redirectError('Invalid state parameter')
    }

    // Exchange code for tokens
    const redirectUri = `${supabaseUrl}/functions/v1/google-callback`
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) {
      const txt = await tokenRes.text()
      console.error('Token exchange failed:', tokenRes.status, txt)
      return redirectError(`Token exchange failed: ${tokenRes.status}`)
    }

    const tokens = await tokenRes.json()
    const { access_token, refresh_token, expires_in, scope } = tokens

    if (!access_token || !refresh_token) {
      return redirectError('Missing tokens in Google response')
    }

    // Fetch Google email
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` }
    })
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : {}
    const email = userInfo.email ?? null

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString()
    const scopes = scope ? scope.split(' ') : []

    // Upsert tokens in DB
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    const { error: upsertError } = await db.from('google_tokens').upsert({
      user_id: userId,
      email,
      access_token,
      refresh_token,
      expires_at: expiresAt,
      scopes,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    if (upsertError) {
      console.error('DB upsert error:', upsertError.message)
      return redirectError('DB error: ' + upsertError.message)
    }

    // Redirect back to app with success
    const successUrl = `${appOrigin}/auth/google/callback?success=true&email=${encodeURIComponent(email ?? '')}`
    return Response.redirect(successUrl, 302)

  } catch (err) {
    console.error('google-callback error:', err?.message)
    return redirectError('Unhandled error: ' + (err?.message ?? String(err)))
  }
})
