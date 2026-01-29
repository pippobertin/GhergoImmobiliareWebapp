import { NextResponse } from 'next/server'
import { createOAuth2Client } from '@/lib/google-auth'

export async function GET(request: Request) {
  try {
    console.log('🔄 Processing OAuth callback')

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('❌ OAuth error:', error)
      return NextResponse.json({
        error: 'OAuth authorization failed',
        details: error
      }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json({
        error: 'Authorization code not provided'
      }, { status: 400 })
    }

    console.log('🔑 Received authorization code')

    const oauth2Client = createOAuth2Client()

    // Scambia il code per i tokens
    const { tokens } = await oauth2Client.getToken(code)
    console.log('✅ Tokens received:', {
      access_token: tokens.access_token ? '***PRESENT***' : 'MISSING',
      refresh_token: tokens.refresh_token ? '***PRESENT***' : 'MISSING',
      expires_in: tokens.expiry_date
    })

    // In produzione, salveresti questi tokens nel database
    // Per ora li restituiamo per test

    // Imposta i credentials per uso immediato
    oauth2Client.setCredentials(tokens)

    // Per ora, salviamo i tokens nelle variabili ambiente temporanee
    // In produzione, questi andrebbero salvati nel database per ogni agente
    process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token || ''
    process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token || ''

    return NextResponse.json({
      success: true,
      message: 'OAuth authorization successful',
      tokens: {
        access_token: tokens.access_token ? '***HIDDEN***' : null,
        refresh_token: tokens.refresh_token ? '***HIDDEN***' : null,
        expires_at: tokens.expiry_date
      }
    })

  } catch (error) {
    console.error('❌ OAuth callback error:', error)
    return NextResponse.json({
      error: 'Failed to process OAuth callback',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}