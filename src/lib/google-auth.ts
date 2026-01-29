import { google } from 'googleapis'

// Configurazione OAuth2
export function createOAuth2Client() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  return oauth2Client
}

// Genera URL di autorizzazione
export function getAuthUrl(oauth2Client: any, scopes: string[]) {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  })

  return authUrl
}

// Scopes necessari per Gmail e Calendar
export const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly'
]

export const CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events'
]

// Start with basic scopes only
export const BASIC_SCOPES = ['https://www.googleapis.com/auth/gmail.send']
export const ALL_SCOPES = [...GMAIL_SCOPES, ...CALENDAR_SCOPES]