/**
 * Google Apps Script da collegare al Google Form
 *
 * ISTRUZIONI PER L'INSTALLAZIONE:
 * 1. Apri il tuo Google Form
 * 2. Clicca sui tre puntini (⋮) > Editor di script
 * 3. Incolla questo codice nell'editor
 * 4. Sostituisci WEBHOOK_URL con l'URL reale della tua app
 * 5. Salva e attiva il trigger onFormSubmit
 */

// Sostituire con l'URL reale del webhook
const WEBHOOK_URL = 'https://yourdomain.com/api/google-form-webhook'

/**
 * Funzione che viene eseguita quando il form viene inviato
 */
function onFormSubmit(e) {
  try {
    console.log('📋 Google Form submitted, processing...')

    // Ottieni le risposte del form
    const response = e.response
    const itemResponses = response.getItemResponses()

    // Estrai l'email del cliente (assumi che sia la prima domanda)
    let clientEmail = ''
    const responses = {}

    itemResponses.forEach(function(itemResponse) {
      const question = itemResponse.getItem().getTitle()
      const answer = itemResponse.getResponse()

      console.log(`Q: ${question} | A: ${answer}`)

      // Cerca l'email (può essere in diverse domande)
      if (question.toLowerCase().includes('email') ||
          question.toLowerCase().includes('e-mail') ||
          question.toLowerCase().includes('mail')) {
        clientEmail = answer
      }

      responses[question] = answer
    })

    if (!clientEmail) {
      console.error('❌ No email found in form responses')
      return
    }

    console.log(`📧 Client email found: ${clientEmail}`)

    // Prepara i dati per il webhook
    const webhookData = {
      email: clientEmail,
      timestamp: new Date().toISOString(),
      formId: e.source.getId(),
      responseId: response.getId(),
      responses: responses
    }

    console.log('🔄 Sending webhook to:', WEBHOOK_URL)

    // Invia webhook alla nostra API
    const options = {
      'method': 'POST',
      'headers': {
        'Content-Type': 'application/json',
      },
      'payload': JSON.stringify(webhookData)
    }

    const webhookResponse = UrlFetchApp.fetch(WEBHOOK_URL, options)
    const responseCode = webhookResponse.getResponseCode()
    const responseText = webhookResponse.getContentText()

    console.log(`✅ Webhook sent. Response: ${responseCode}`)
    console.log('Response body:', responseText)

    if (responseCode === 200) {
      console.log('✅ Brochure will be sent automatically')
    } else {
      console.error(`❌ Webhook failed with status: ${responseCode}`)
    }

  } catch (error) {
    console.error('❌ Error processing form submission:', error)
  }
}

/**
 * Funzione per installare il trigger automaticamente
 * Esegui questa funzione una volta per attivare l'automazione
 */
function installTrigger() {
  try {
    // Rimuovi eventuali trigger esistenti
    const triggers = ScriptApp.getProjectTriggers()
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onFormSubmit') {
        ScriptApp.deleteTrigger(trigger)
      }
    })

    // Crea nuovo trigger per form submission
    ScriptApp.newTrigger('onFormSubmit')
      .onFormSubmit()
      .create()

    console.log('✅ Trigger installed successfully')

  } catch (error) {
    console.error('❌ Error installing trigger:', error)
  }
}

/**
 * Funzione di test per verificare il webhook
 */
function testWebhook() {
  const testData = {
    email: 'test@example.com',
    timestamp: new Date().toISOString(),
    formId: 'test-form-id',
    responseId: 'test-response-id',
    responses: {
      'Email': 'test@example.com',
      'Nome': 'Test',
      'Cognome': 'User',
      'Reddito Annuo': '50000',
      'Tipo di Finanziamento': 'Mutuo'
    }
  }

  const options = {
    'method': 'POST',
    'headers': {
      'Content-Type': 'application/json',
    },
    'payload': JSON.stringify(testData)
  }

  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, options)
    console.log('Test webhook response:', response.getContentText())
  } catch (error) {
    console.error('Test webhook error:', error)
  }
}