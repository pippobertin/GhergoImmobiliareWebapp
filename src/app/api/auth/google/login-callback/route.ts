import { NextResponse } from 'next/server'
import { createOAuth2Client } from '@/lib/google-auth'
import { supabase } from '@/lib/supabase'
import { google } from 'googleapis'

export async function GET(request: Request) {
  try {
    console.log('🔄 Processing Google login callback')

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')

    if (error) {
      console.error('❌ OAuth error:', error)
      // Redirect to login with error
      return NextResponse.redirect(
        new URL(`/admin/login?error=${encodeURIComponent('Autenticazione Google fallita')}`, request.url)
      )
    }

    if (!code) {
      return NextResponse.redirect(
        new URL('/admin/login?error=' + encodeURIComponent('Codice autorizzazione mancante'), request.url)
      )
    }

    console.log('🔑 Received authorization code')

    // Ottieni i token da Google
    const oauth2Client = createOAuth2Client(
      `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/google/login-callback`
    )

    const { tokens } = await oauth2Client.getToken(code)
    console.log('✅ Tokens received')

    oauth2Client.setCredentials(tokens)

    // Ottieni informazioni utente da Google
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const { data: userInfo } = await oauth2.userinfo.get()

    console.log('👤 User info from Google:', {
      email: userInfo.email,
      name: userInfo.name
    })

    if (!userInfo.email) {
      return NextResponse.redirect(
        new URL('/admin/login?error=' + encodeURIComponent('Email non disponibile da Google'), request.url)
      )
    }

    // Cerca l'agente nel database
    const { data: agent, error: agentError } = await supabase
      .from('gre_agents')
      .select('*')
      .eq('email', userInfo.email)
      .eq('is_active', true)
      .single()

    if (agentError || !agent) {
      console.error('❌ Agent not found or inactive:', userInfo.email)
      return NextResponse.redirect(
        new URL('/admin/login?error=' + encodeURIComponent('Account non trovato o non attivo'), request.url)
      )
    }

    console.log('✅ Agent found:', agent.email)

    // Verifica che il login Google sia abilitato per questo agente
    if (!agent.google_oauth_enabled) {
      console.error('❌ Google OAuth not enabled for agent:', userInfo.email)
      return NextResponse.redirect(
        new URL('/admin/login?error=' + encodeURIComponent('Login con Google non abilitato per questo account. Contatta l\'amministratore.'), request.url)
      )
    }

    console.log('✅ Google OAuth enabled for agent:', agent.email)

    // Crea sessione Supabase
    // Nota: Per usare OAuth Google con Supabase, dovremmo configurare il provider in Supabase
    // Per ora, creiamo una sessione manualmente usando il service role
    // In produzione, configurerai Google OAuth direttamente in Supabase

    // Salva i token Google nel database
    const googleTokens = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      token_type: tokens.token_type,
      scope: tokens.scope,
      updated_at: new Date().toISOString()
    }

    const { error: updateError } = await supabase
      .from('gre_agents')
      .update({ google_tokens: googleTokens })
      .eq('id', agent.id)

    if (updateError) {
      console.error('⚠️  Warning: Could not save Google tokens:', updateError)
      // Non blocchiamo il login se non riusciamo a salvare i token
      // L'utente potrà comunque accedere
    } else {
      console.log('💾 Google tokens saved to database')
    }

    // Determina la dashboard appropriata
    const dashboardUrl = agent.role === 'admin' ? '/admin/dashboard' : '/dashboard'

    // Crea un response con cookie per il login Google temporaneo
    const redirectUrl = new URL(dashboardUrl, request.url)
    const response = NextResponse.redirect(redirectUrl)

    // Salva i dati dell'agente in un cookie temporaneo (max 5 minuti)
    // Il frontend userà questi dati per completare il login Supabase
    response.cookies.set('google_login_pending', JSON.stringify({
      agent_id: agent.id,
      email: agent.email,
      role: agent.role
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300 // 5 minuti
    })

    return response

  } catch (error) {
    console.error('❌ Login callback error:', error)
    return NextResponse.redirect(
      new URL(
        '/admin/login?error=' + encodeURIComponent('Errore durante il login con Google'),
        request.url
      )
    )
  }
}
