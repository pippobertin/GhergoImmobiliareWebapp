import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { createOpenHouseEvent } from '@/lib/calendar'

export async function POST(request: Request) {
  try {
    const { bookingId } = await request.json()

    console.log(`📅 Creating calendar event for booking: ${bookingId}`)

    // Recupera i dati della prenotazione
    const { data: bookingData, error } = await supabase
      .from('gre_bookings')
      .select(`
        *,
        gre_clients (*),
        gre_time_slots (*),
        gre_open_houses (
          *,
          gre_properties (*),
          gre_agents (*)
        )
      `)
      .eq('id', bookingId)
      .single()

    if (error || !bookingData) {
      return NextResponse.json({ error: 'Prenotazione non trovata' }, { status: 404 })
    }

    // Controlla se l'evento è già stato creato
    if (bookingData.calendar_event_id) {
      return NextResponse.json({
        success: true,
        message: 'Evento calendario già esistente',
        eventId: bookingData.calendar_event_id
      })
    }

    const client = bookingData.gre_clients
    const timeSlot = bookingData.gre_time_slots
    const openHouse = bookingData.gre_open_houses
    const property = openHouse.gre_properties
    const agent = openHouse.gre_agents

    // Crea l'evento nel calendario
    const calendarResult = await createOpenHouseEvent({
      client,
      property,
      openHouse,
      timeSlot,
      agent
    })

    if (calendarResult.success) {
      // Salva l'ID dell'evento nel database
      const { error: updateError } = await supabase
        .from('gre_bookings')
        .update({
          calendar_event_id: calendarResult.eventId,
          calendar_event_link: calendarResult.eventLink
        })
        .eq('id', bookingId)

      if (updateError) {
        console.error('❌ Error saving calendar event ID:', updateError)
        // Non failliamo l'operazione per questo, l'evento è stato comunque creato
      } else {
        console.log(`✅ Calendar event ID saved: ${calendarResult.eventId}`)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Evento calendario creato con successo',
      eventId: calendarResult.eventId,
      eventLink: calendarResult.eventLink,
      summary: calendarResult.summary
    })

  } catch (error) {
    console.error('❌ Error creating calendar event:', error)
    return NextResponse.json({
      error: 'Errore nella creazione dell\'evento calendario',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Endpoint per cancellare eventi
export async function DELETE(request: Request) {
  try {
    const { bookingId } = await request.json()

    console.log(`🗑️ Deleting calendar event for booking: ${bookingId}`)

    // Recupera l'ID dell'evento dal database
    const { data: booking, error } = await supabase
      .from('gre_bookings')
      .select('calendar_event_id')
      .eq('id', bookingId)
      .single()

    if (error || !booking?.calendar_event_id) {
      return NextResponse.json({ error: 'Evento calendario non trovato' }, { status: 404 })
    }

    // Importa la funzione di cancellazione
    const { deleteCalendarEvent } = await import('@/lib/calendar')

    await deleteCalendarEvent(booking.calendar_event_id)

    // Rimuovi l'ID dal database
    await supabase
      .from('gre_bookings')
      .update({
        calendar_event_id: null,
        calendar_event_link: null
      })
      .eq('id', bookingId)

    return NextResponse.json({
      success: true,
      message: 'Evento calendario cancellato con successo'
    })

  } catch (error) {
    console.error('❌ Error deleting calendar event:', error)
    return NextResponse.json({
      error: 'Errore nella cancellazione dell\'evento calendario',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}