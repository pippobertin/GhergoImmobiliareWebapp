import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createOAuth2Client } from '@/lib/google-auth'

export async function GET() {
  try {
    console.log('🔍 Checking Google OAuth status...')

    const oauth2Client = createOAuth2Client()

    // Controlla se ci sono tokens salvati
    const tokens = {
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    }

    if (!tokens.access_token || !tokens.refresh_token) {
      return NextResponse.json({
        connected: false,
        reason: 'No tokens found',
        message: 'Autenticazione Google necessaria'
      })
    }

    // Imposta i tokens e testa la connessione
    oauth2Client.setCredentials(tokens)

    try {
      // Test Gmail API
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
      await gmail.users.getProfile({ userId: 'me' })

      // Test Calendar API
      const calendar = google.calendar({ version: 'v3', auth: oauth2Client })
      await calendar.calendars.get({ calendarId: 'primary' })

      console.log('✅ Google OAuth connection successful')

      return NextResponse.json({
        connected: true,
        services: {
          gmail: true,
          calendar: true
        },
        message: 'Google services connessi correttamente'
      })

    } catch (apiError) {
      console.error('❌ Google API test failed:', apiError)

      // Se i token sono scaduti, prova a refresharli
      if (apiError instanceof Error && apiError.message.includes('invalid_grant')) {
        return NextResponse.json({
          connected: false,
          reason: 'Tokens expired',
          message: 'Tokens scaduti, riautenticazione necessaria'
        })
      }

      return NextResponse.json({
        connected: false,
        reason: 'API test failed',
        message: 'Errore di connessione ai servizi Google'
      })
    }

  } catch (error) {
    console.error('❌ Error checking Google status:', error)
    return NextResponse.json({
      connected: false,
      reason: 'System error',
      message: 'Errore nel controllo dello stato Google'
    }, { status: 500 })
  }
}