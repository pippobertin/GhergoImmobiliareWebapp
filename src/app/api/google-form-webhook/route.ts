import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendEmail, createEmailTemplate } from '@/lib/gmail'

export async function POST(request: Request) {
  try {
    console.log('🔔 Received Google Form webhook')

    const body = await request.json()
    console.log('📋 Webhook data:', body)

    // Estrai dati dal webhook
    const {
      email,           // Email del cliente
      timestamp,       // Timestamp del form
      responses        // Risposte del questionario
    } = body

    if (!email) {
      console.error('❌ No email provided in webhook')
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    console.log(`🔍 Looking for booking with client email: ${email}`)

    // Trova la prenotazione corrispondente all'email
    const { data: booking, error: findError } = await supabase
      .from('gre_bookings')
      .select(`
        id,
        status,
        questionnaire_completed,
        brochure_email_sent,
        gre_clients!inner (id, nome, cognome, email),
        gre_open_houses!inner (
          id,
          gre_properties!inner (id, titolo, brochure_url),
          gre_agents!inner (id, nome, cognome, email)
        )
      `)
      .eq('gre_clients.email', email)
      .eq('status', 'confirmed')
      .eq('questionnaire_completed', false)  // Solo se non ancora completato
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (findError || !booking) {
      console.log(`ℹ️ No pending booking found for email: ${email}`)
      return NextResponse.json({
        message: 'No pending booking found for this email',
        email
      }, { status: 200 })
    }

    console.log(`✅ Found booking: ${booking.id}`)

    // Aggiorna il database - questionario completato
    const { error: updateError } = await supabase
      .from('gre_bookings')
      .update({
        questionnaire_completed: true,
        // Salva le risposte del questionario se necessario
        // questionnaire_responses: responses
      })
      .eq('id', booking.id)

    if (updateError) {
      console.error('❌ Error updating booking:', updateError)
      return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
    }

    console.log(`✅ Marked questionnaire as completed for booking: ${booking.id}`)

    // Invia email con brochure se non già inviata
    if (!booking.brochure_email_sent) {
      const property = booking.gre_open_houses.gre_properties
      const client = booking.gre_clients
      const agent = booking.gre_open_houses.gre_agents

      console.log('📧 Sending brochure email...')

      await sendEmail({
        to: client.email,
        subject: `Brochure - ${property.titolo}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0;">GHERGO IMMOBILIARE</h1>
              <h2 style="margin: 10px 0 0 0;">Brochure dell'Immobile</h2>
            </div>

            <div style="padding: 20px; background-color: #f8fafc;">
              <p>Gentile <strong>${client.nome} ${client.cognome}</strong>,</p>

              <p>Grazie per aver completato il questionario di prequalifica!</p>
              <p>Come promesso, trova di seguito la brochure completa dell'immobile <strong>${property.titolo}</strong>.</p>

              <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
                <h3 style="color: #1e40af; margin-top: 0;">📄 Brochure Immobile</h3>
                <a href="${property.brochure_url}"
                   style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;"
                   target="_blank">
                  Scarica Brochure PDF
                </a>
              </div>

              <p>Per qualsiasi domanda, non esiti a contattare il suo agente di riferimento:</p>
              <p><strong>${agent.nome} ${agent.cognome}</strong><br>
              Email: <a href="mailto:${agent.email}">${agent.email}</a></p>

              <p>Cordiali saluti,<br>
              <strong>Team Ghergo Immobiliare</strong></p>
            </div>

            <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
              <p>Email automatica inviata dopo il completamento del questionario di prequalifica</p>
            </div>
          </div>
        `
      })

      console.log(`✅ Brochure email sent to ${client.email}`)

      // Aggiorna flag email inviata
      const { error: emailUpdateError } = await supabase
        .from('gre_bookings')
        .update({
          brochure_email_sent: true
        })
        .eq('id', booking.id)

      if (emailUpdateError) {
        console.error('❌ Error updating brochure email flag:', emailUpdateError)
      } else {
        console.log('✅ Brochure email sent via Gmail API and flagged')
      }
    } else {
      console.log('ℹ️ Brochure email already sent')
    }

    return NextResponse.json({
      success: true,
      message: 'Questionnaire completed and brochure sent via Gmail API',
      bookingId: booking.id
    })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Endpoint per testare manualmente
export async function GET(request: Request) {
  return NextResponse.json({
    status: 'Google Form Webhook endpoint is active',
    timestamp: new Date().toISOString(),
    url: request.url
  })
}