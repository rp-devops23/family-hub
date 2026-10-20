import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { AGENT_CONFIG } from "./agent_config.ts"

export interface GoogleTokenRow {
  access_token: string
  refresh_token: string
  expires_at: string
  email: string | null
  scopes: string[] | null
}

/**
 * Returns a valid access token for the given user.
 * If the stored token is expired (or within 60s of expiring), refreshes it first.
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const { data: row, error } = await db
    .from('google_tokens')
    .select('access_token, refresh_token, expires_at, email, scopes')
    .eq('user_id', userId)
    .single()

  if (error || !row) return null

  const expiresAt = new Date(row.expires_at).getTime()
  const nowMs = Date.now()

  // Still valid (with 60s buffer)
  if (expiresAt - nowMs > 60_000) return row.access_token

  // Refresh
  const clientId = Deno.env.get('GOOGLE_CLIENT_ID')!
  const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET')!

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  })

  if (!res.ok) {
    console.error('Google token refresh failed:', res.status, await res.text())
    return null
  }

  const json = await res.json()
  const newExpiry = new Date(Date.now() + json.expires_in * 1000).toISOString()

  await db.from('google_tokens').update({
    access_token: json.access_token,
    expires_at: newExpiry,
    updated_at: new Date().toISOString(),
  }).eq('user_id', userId)

  return json.access_token
}

/**
 * Fetch upcoming Google Calendar events for the next `daysAhead` days.
 */
export async function fetchCalendarEvents(accessToken: string, daysAhead: number = AGENT_CONFIG.tools.calendarDaysDefault): Promise<string> {
  const now = new Date().toISOString()
  const end = new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000).toISOString()

  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(now)}&timeMax=${encodeURIComponent(end)}&singleEvents=true&orderBy=startTime&maxResults=50`

  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) return ''

  const json = await res.json()
  const events = (json.items ?? []).map((e: Record<string, unknown>) => {
    const start = (e.start as Record<string, string>)?.dateTime || (e.start as Record<string, string>)?.date
    return `${start}: ${e.summary}`
  })
  return events.join('\n')
}

/**
 * Fetch the most recent Gmail messages (read and unread), with unread indicator.
 * Message details are fetched in parallel (one request per message, but concurrently).
 */
export async function fetchGmailSummary(accessToken: string, limit: number = AGENT_CONFIG.tools.emailsDefault): Promise<string> {
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${limit}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  if (!listRes.ok) return ''

  const list = await listRes.json()
  const details = await Promise.all((list.messages ?? []).slice(0, limit).map(async (msg: { id: string }) => {
    const detailRes = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!detailRes.ok) return null
    const detail = await detailRes.json()
    const headers: Array<{name: string, value: string}> = detail.payload?.headers ?? []
    const subject = headers.find(h => h.name === 'Subject')?.value ?? '(no subject)'
    const from = headers.find(h => h.name === 'From')?.value ?? ''
    const date = headers.find(h => h.name === 'Date')?.value ?? ''
    const isUnread = (detail.labelIds ?? []).includes('UNREAD')
    return `[${isUnread ? 'NON LU' : 'lu'}] ${date} | De: ${from} | Sujet: ${subject}`
  }))

  return details.filter(Boolean).join('\n')
}
