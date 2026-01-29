import { google } from 'googleapis'
import { createOAuth2Client } from './google-auth'

interface EmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  attachments?: Array<{
    filename: string
    path?: string
    content?: Buffer | string
    contentType?: string
  }>
}

export async function sendEmail(options: EmailOptions) {
  try {
    console.log(`📧 Sending email to: ${options.to}`)
    console.log(`📧 Subject: ${options.subject}`)

    const oauth2Client = createOAuth2Client()

    // Usa i tokens salvati (in produzione verrebbero dal database)
    const tokens = {
      access_token: process.env.GOOGLE_ACCESS_TOKEN,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    }

    if (!tokens.access_token) {
      throw new Error('Google access token not available. Please authenticate first.')
    }

    oauth2Client.setCredentials(tokens)

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })

    // Crea il messaggio email in formato RFC 2822
    const emailLines = [
      `To: ${options.to}`,
      `Subject: ${options.subject}`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      options.html
    ]

    const email = emailLines.join('\n')
    const encodedEmail = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    // Invia l'email
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail
      }
    })

    console.log('✅ Email sent successfully:', result.data.id)

    return {
      success: true,
      messageId: result.data.id,
      to: options.to,
      subject: options.subject
    }

  } catch (error) {
    console.error('❌ Failed to send email:', error)

    if (error instanceof Error && error.message.includes('access_token')) {
      throw new Error('Gmail authentication required. Please authorize the application first.')
    }

    throw error
  }
}

// Helper per creare template email
export function createEmailTemplate(type: 'confirmation' | 'brochure', data: any) {
  const templates = {
    confirmation: {
      subject: `Conferma prenotazione Open House - ${data.property.titolo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">GHERGO IMMOBILIARE</h1>
            <h2 style="margin: 10px 0 0 0;">Conferma Prenotazione Open House</h2>
          </div>

          <div style="padding: 20px; background-color: #f8fafc;">
            <p>Gentile <strong>${data.client.nome} ${data.client.cognome}</strong>,</p>

            <p>La sua prenotazione per l'Open House è stata confermata con successo!</p>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
              <h3 style="color: #1e40af; margin-top: 0;">Dettagli della prenotazione</h3>

              <p><strong>Immobile:</strong> ${data.property.titolo}</p>
              <p><strong>Indirizzo:</strong> ${data.property.zona}</p>
              <p><strong>Data:</strong> ${new Date(data.openHouse.data_evento).toLocaleDateString('it-IT', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</p>
              <p><strong>Orario slot:</strong> ${data.timeSlot.ora_inizio} - ${data.timeSlot.ora_fine}</p>

              <hr style="margin: 20px 0;">

              <h4 style="color: #1e40af;">Agente di riferimento</h4>
              <p><strong>${data.agent.nome} ${data.agent.cognome}</strong></p>
              <p>Email: <a href="mailto:${data.agent.email}">${data.agent.email}</a></p>
            </div>

            <div style="background-color: #dbeafe; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4 style="margin-top: 0; color: #1e40af;">📋 Prossimi passi</h4>
              <ol>
                <li>Complete il <a href="https://forms.gle/Gdhg4nyebiofTBE27" target="_blank">questionario di prequalifica</a></li>
                <li>Riceverà la brochure dell'immobile dopo il completamento del questionario</li>
                <li>Si presenti all'appuntamento con un documento di identità</li>
              </ol>
            </div>

            <p>Cordiali saluti,<br>
            <strong>Team Ghergo Immobiliare</strong></p>
          </div>
        </div>
      `
    },

    brochure: {
      subject: `Brochure - ${data.property.titolo}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #1e40af; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0;">GHERGO IMMOBILIARE</h1>
            <h2 style="margin: 10px 0 0 0;">Brochure dell'Immobile</h2>
          </div>

          <div style="padding: 20px; background-color: #f8fafc;">
            <p>Gentile <strong>${data.client.nome} ${data.client.cognome}</strong>,</p>

            <p>Grazie per aver completato il questionario di prequalifica!</p>
            <p>Come promesso, trova di seguito la brochure completa dell'immobile <strong>${data.property.titolo}</strong>.</p>

            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
              <h3 style="color: #1e40af; margin-top: 0;">📄 Brochure Immobile</h3>
              <a href="${data.property.brochure_url}"
                 style="background-color: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;"
                 target="_blank">
                Scarica Brochure PDF
              </a>
            </div>

            <p>Per qualsiasi domanda, non esiti a contattare il suo agente di riferimento:</p>
            <p><strong>${data.agent.nome} ${data.agent.cognome}</strong><br>
            Email: <a href="mailto:${data.agent.email}">${data.agent.email}</a></p>

            <p>Cordiali saluti,<br>
            <strong>Team Ghergo Immobiliare</strong></p>
          </div>

          <div style="background-color: #f1f5f9; padding: 15px; text-align: center; font-size: 12px; color: #64748b;">
            <p>Email automatica inviata dopo il completamento del questionario di prequalifica</p>
          </div>
        </div>
      `
    }
  }

  return templates[type]
}