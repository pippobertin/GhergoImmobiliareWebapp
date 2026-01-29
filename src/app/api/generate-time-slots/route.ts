import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Client admin con service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { openHouseId } = await request.json()

    if (!openHouseId) {
      return NextResponse.json({ error: 'Open House ID mancante' }, { status: 400 })
    }

    // Ottieni dettagli Open House
    const { data: openHouse, error: openHouseError } = await supabaseAdmin
      .from('gre_open_houses')
      .select('*')
      .eq('id', openHouseId)
      .single()

    if (openHouseError || !openHouse) {
      return NextResponse.json({ error: 'Open House non trovato' }, { status: 404 })
    }

    // Elimina slot esistenti per questo Open House
    await supabaseAdmin
      .from('gre_time_slots')
      .delete()
      .eq('open_house_id', openHouseId)

    // Genera nuovi slot
    const slots = generateTimeSlots(
      openHouse.ora_inizio,
      openHouse.ora_fine,
      openHouse.durata_slot,
      openHouse.max_partecipanti_slot
    )

    // Inserisci i nuovi slot
    const slotsData = slots.map(slot => ({
      open_house_id: openHouseId,
      ora_inizio: slot.ora_inizio,
      ora_fine: slot.ora_fine,
      max_partecipanti: slot.max_partecipanti,
      partecipanti_attuali: 0,
      is_available: true
    }))

    const { data, error } = await supabaseAdmin
      .from('gre_time_slots')
      .insert(slotsData)
      .select()

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      slotsCreated: data.length,
      slots: data
    })

  } catch (error: any) {
    console.error('Error generating time slots:', error)
    return NextResponse.json(
      { error: error.message || 'Errore interno del server' },
      { status: 500 }
    )
  }
}

function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDurationMinutes: number,
  maxParticipants: number
): Array<{ ora_inizio: string; ora_fine: string; max_partecipanti: number }> {
  const slots = []

  // Converti orari in minuti
  const [startHour, startMin] = startTime.split(':').map(Number)
  const [endHour, endMin] = endTime.split(':').map(Number)

  const startMinutes = startHour * 60 + startMin
  const endMinutes = endHour * 60 + endMin

  // Genera slot
  for (let current = startMinutes; current + slotDurationMinutes <= endMinutes; current += slotDurationMinutes) {
    const slotStart = minutesToTime(current)
    const slotEnd = minutesToTime(current + slotDurationMinutes)

    slots.push({
      ora_inizio: slotStart,
      ora_fine: slotEnd,
      max_partecipanti: maxParticipants
    })
  }

  return slots
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`
}