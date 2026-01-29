import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Client admin con service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { email, nome, cognome, role } = await request.json()

    if (!email || !nome || !cognome || !role) {
      return NextResponse.json({ error: 'Dati mancanti' }, { status: 400 })
    }

    const defaultPassword = `${cognome.toLowerCase()}123`

    // 1. Crea utente auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: defaultPassword,
      email_confirm: true
    })

    if (authError) {
      throw authError
    }

    // 2. Crea record agente
    const { data: agent, error: agentError } = await supabaseAdmin
      .from('gre_agents')
      .insert({
        email,
        nome,
        cognome,
        role,
        is_active: true,
        password_changed: false
      })
      .select()
      .single()

    if (agentError) {
      // Se fallisce, elimina l'utente auth creato
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      throw agentError
    }

    return NextResponse.json({
      success: true,
      agent,
      temporaryPassword: defaultPassword
    })

  } catch (error: any) {
    console.error('Error creating agent:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    )
  }
}