'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Helper function per rimuovere i secondi dagli orari
const formatTime = (timeString: string): string => {
  return timeString.slice(0, 5) // Prende solo HH:MM
}

interface Property {
  id: string
  titolo: string
  descrizione: string
  prezzo: number
  tipologia: string
  zona: string
  indirizzo: string
  caratteristiche: any
  immagini: string[]
}

interface OpenHouse {
  id: string
  property_id: string
  agent_id: string
  data_evento: string
  ora_inizio: string
  ora_fine: string
  durata_slot_minuti: number
  max_partecipanti_slot: number
  descrizione: string
  is_active: boolean
  property: Property
  agent: {
    id: string
    nome: string
    cognome: string
    email: string
  }
}

interface TimeSlot {
  id: string
  open_house_id: string
  data_slot: string
  ora_inizio: string
  ora_fine: string
  posti_disponibili: number
  posti_occupati: number
  is_available: boolean
  max_partecipanti?: number
  gre_bookings?: Array<{
    id: string
    status: string
    client_id: string
  }>
}

interface BookingForm {
  nome: string
  cognome: string
  email: string
  telefono: string
  messaggio: string
  privacy_accepted: boolean
  marketing_accepted: boolean
}

export default function OpenHouseDetail() {
  const params = useParams()
  const router = useRouter()
  const openHouseId = params.id as string

  const [openHouse, setOpenHouse] = useState<OpenHouse | null>(null)
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [formData, setFormData] = useState<BookingForm>({
    nome: '',
    cognome: '',
    email: '',
    telefono: '',
    messaggio: '',
    privacy_accepted: false,
    marketing_accepted: false
  })

  useEffect(() => {
    if (openHouseId) {
      loadOpenHouseData()
    }
  }, [openHouseId])

  // Carosello automatico delle immagini
  useEffect(() => {
    if (openHouse?.property.immagini && openHouse.property.immagini.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex(prevIndex =>
          prevIndex === openHouse.property.immagini.length - 1 ? 0 : prevIndex + 1
        )
      }, 4000) // Cambia immagine ogni 4 secondi

      return () => clearInterval(interval)
    }
  }, [openHouse?.property.immagini])

  const loadOpenHouseData = async () => {
    try {
      // Carica dati Open House con property e agent
      const { data: openHouseData, error: ohError } = await supabase
        .from('gre_open_houses')
        .select(`
          *,
          gre_properties (id, titolo, descrizione, prezzo, tipologia, zona, indirizzo, caratteristiche, immagini),
          gre_agents (id, nome, cognome, email)
        `)
        .eq('id', openHouseId)
        .eq('is_active', true)
        .single()

      if (ohError) {
        console.error('Error loading open house:', ohError)
        return
      }

      const transformedData = {
        ...openHouseData,
        property: openHouseData.gre_properties,
        agent: openHouseData.gre_agents
      }
      setOpenHouse(transformedData)

      // Carica time slots con informazioni prenotazioni
      const { data: slotsData, error: slotsError } = await supabase
        .from('gre_time_slots')
        .select(`
          *,
          gre_bookings!left (
            id,
            status,
            client_id
          )
        `)
        .eq('open_house_id', openHouseId)
        .order('ora_inizio')

      if (slotsError) {
        console.error('Error loading time slots:', slotsError)
        return
      }

      // Calcola posti occupati per ogni slot
      const slotsWithOccupancy = (slotsData || []).map(slot => {
        const bookings = slot.gre_bookings || []
        const confirmedBookings = bookings.filter(booking => booking.status === 'confirmed')
        const maxPartecipanti = slot.max_partecipanti || 1 // default: 1 persona per slot

        return {
          ...slot,
          posti_occupati: confirmedBookings.length,
          posti_disponibili: maxPartecipanti
        }
      })

      console.log('🔄 Slots with occupancy:', slotsWithOccupancy)
      setTimeSlots(slotsWithOccupancy)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSlotSelection = (slotId: string) => {
    setSelectedSlot(slotId)
    setShowBookingForm(true)
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedSlot || !openHouse) return

    if (!formData.privacy_accepted) {
      alert('È necessario accettare l\'informativa privacy per procedere.')
      return
    }

    setSubmitting(true)

    try {
      // 1. Salva o trova cliente
      let clientId
      const { data: existingClient } = await supabase
        .from('gre_clients')
        .select('id')
        .eq('email', formData.email)
        .single()

      if (existingClient) {
        clientId = existingClient.id
        // Aggiorna dati cliente esistente
        await supabase
          .from('gre_clients')
          .update({
            nome: formData.nome,
            cognome: formData.cognome,
            telefono: formData.telefono,
            gdpr_consent: formData.privacy_accepted
          })
          .eq('id', clientId)
      } else {
        // Crea nuovo cliente con struttura corretta della tabella
        const { data: newClient, error: clientError } = await supabase
          .from('gre_clients')
          .insert({
            nome: formData.nome,
            cognome: formData.cognome,
            email: formData.email,
            telefono: formData.telefono,
            gdpr_consent: formData.privacy_accepted
          })
          .select('id')
          .single()

        if (clientError) {
          console.error('Error creating client:', clientError)
          console.error('Form data being sent:', {
            nome: formData.nome,
            cognome: formData.cognome,
            email: formData.email,
            telefono: formData.telefono,
            gdpr_consent: formData.privacy_accepted
          })
          alert(`Errore durante la creazione dell'account cliente: ${clientError.message}`)
          return
        }
        clientId = newClient.id
      }

      // 2. Crea prenotazione con struttura corretta della tabella
      const { data: newBooking, error: bookingError } = await supabase
        .from('gre_bookings')
        .insert({
          open_house_id: openHouseId,
          time_slot_id: selectedSlot,
          client_id: clientId,
          agent_id: openHouse.agent_id,
          status: 'confirmed',
          questionnaire_completed: false,
          confirmation_email_sent: false,
          brochure_email_sent: false
        })
        .select('id')
        .single()

      if (bookingError) {
        console.error('Error creating booking:', bookingError)
        console.error('Booking data being sent:', {
          open_house_id: openHouseId,
          time_slot_id: selectedSlot,
          client_id: clientId,
          agent_id: openHouse.agent_id,
          status: 'confirmed',
          questionnaire_completed: false,
          confirmation_email_sent: false,
          brochure_email_sent: false
        })
        alert(`Errore durante la prenotazione: ${bookingError.message}`)
        return
      }

      // 3. Invio email di conferma e notifica agente
      try {
        // Email di conferma al cliente
        await fetch('/api/send-booking-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: newBooking.id, type: 'client_confirmation' })
        })

        // Email di notifica all'agente
        await fetch('/api/send-booking-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookingId: newBooking.id, type: 'agent_notification' })
        })
      } catch (emailError) {
        console.error('Errore invio email:', emailError)
        // Non blocchiamo la prenotazione se fallisce l'email
      }

      // 4. Ricarica gli slot per aggiornare la disponibilità
      await loadOpenHouseData()

      // 5. Redirect al form prequalifica Google
      const googleFormUrl = 'https://forms.gle/Gdhg4nyebiofTBE27'
      window.open(googleFormUrl, '_blank')

      alert('Prenotazione confermata! Ti abbiamo reindirizzato al questionario di prequalifica. Riceverai a breve una email di conferma con la brochure dell\'immobile.')

      // Reset form state
      setShowBookingForm(false)
      setSelectedSlot(null)
      setFormData({ nome: '', cognome: '', email: '', telefono: '', privacy_accepted: false })

    } catch (error) {
      console.error('Error:', error)
      alert('Errore durante la prenotazione. Riprova.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-blue)' }}></div>
      </div>
    )
  }

  if (!openHouse) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-dark)' }}>Open House non trovato</h1>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Torna alla Homepage
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header style={{ backgroundColor: 'var(--primary-blue)' }} className="text-white py-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold">GHERGO</h1>
              <span className="nav-text text-sm">IMMOBILIARE</span>
            </div>
            <button
              onClick={() => router.push('/')}
              className="text-white hover:text-gray-200 transition-colors nav-text text-sm"
            >
              ← TORNA AGLI OPEN HOUSE
            </button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">

          {/* Property Header */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
            {/* Property Images Carousel */}
            <div className="h-96 relative overflow-hidden">
              {openHouse.property.immagini && openHouse.property.immagini.length > 0 ? (
                <div className="relative h-full">
                  {/* Main carousel container */}
                  <div className="relative h-full">
                    {openHouse.property.immagini.map((image, index) => (
                      <div
                        key={index}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                          index === currentImageIndex ? 'opacity-100' : 'opacity-0'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`${openHouse.property.titolo} - Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  {/* Navigation arrows */}
                  {openHouse.property.immagini.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(prev =>
                          prev === 0 ? openHouse.property.immagini.length - 1 : prev - 1
                        )}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(prev =>
                          prev === openHouse.property.immagini.length - 1 ? 0 : prev + 1
                        )}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                      >
                        ›
                      </button>
                    </>
                  )}

                  {/* Image navigation indicators */}
                  {openHouse.property.immagini.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                      {openHouse.property.immagini.map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setCurrentImageIndex(index)}
                          className={`w-3 h-3 rounded-full transition-all ${
                            index === currentImageIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/70'
                          }`}
                        />
                      ))}
                    </div>
                  )}

                  {/* Image count indicator */}
                  <div className="absolute top-4 right-4 bg-black bg-opacity-70 text-white text-sm px-3 py-1 rounded">
                    {currentImageIndex + 1} / {openHouse.property.immagini.length}
                  </div>
                </div>
              ) : null}

              {/* Fallback placeholder */}
              <div
                className="w-full h-full bg-gradient-to-r from-gray-200 to-gray-300 flex items-center justify-center"
                style={{ display: openHouse.property.immagini?.length > 0 ? 'none' : 'flex' }}
              >
                <span style={{ color: 'var(--text-gray)' }}>Immagine non disponibile</span>
              </div>
            </div>

            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-dark)' }}>
                    {openHouse.property.titolo}
                  </h1>
                  <p className="text-lg" style={{ color: 'var(--text-gray)' }}>
                    📍 {openHouse.property.zona}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold" style={{ color: 'var(--primary-blue)' }}>
                    € {openHouse.property.prezzo?.toLocaleString('it-IT')}
                  </p>
                  <p className="text-sm capitalize" style={{ color: 'var(--text-gray)' }}>
                    {openHouse.property.tipologia}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {openHouse.property.caratteristiche?.mq && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-semibold" style={{ color: 'var(--primary-blue)' }}>
                      {openHouse.property.caratteristiche.mq} m²
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-gray)' }}>Superficie</div>
                  </div>
                )}
                {openHouse.property.caratteristiche?.locali && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-semibold" style={{ color: 'var(--primary-blue)' }}>
                      {openHouse.property.caratteristiche.locali}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-gray)' }}>Locali</div>
                  </div>
                )}
                {openHouse.property.caratteristiche?.bagni && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-semibold" style={{ color: 'var(--primary-blue)' }}>
                      {openHouse.property.caratteristiche.bagni}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-gray)' }}>Bagni</div>
                  </div>
                )}
                {openHouse.property.caratteristiche?.piano && (
                  <div className="text-center p-3 bg-gray-50 rounded">
                    <div className="font-semibold" style={{ color: 'var(--primary-blue)' }}>
                      Piano {openHouse.property.caratteristiche.piano}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-gray)' }}>Piano</div>
                  </div>
                )}
              </div>

              <p className="text-lg leading-relaxed" style={{ color: 'var(--text-dark)' }}>
                {openHouse.property.descrizione}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Open House Info */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--text-dark)' }}>
                  Informazioni Open House
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--primary-blue)' }}>
                      📅 Data e Orario
                    </h3>
                    <p style={{ color: 'var(--text-dark)' }}>
                      {new Date(openHouse.data_evento).toLocaleDateString('it-IT', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                    <p className="font-medium" style={{ color: 'var(--text-dark)' }}>
                      {formatTime(openHouse.ora_inizio)} - {formatTime(openHouse.ora_fine)}
                    </p>
                  </div>

                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--primary-blue)' }}>
                      👨‍💼 Agente di riferimento
                    </h3>
                    <p className="font-medium" style={{ color: 'var(--text-dark)' }}>
                      {openHouse.agent.nome} {openHouse.agent.cognome}
                    </p>
                    <p className="text-sm" style={{ color: 'var(--text-gray)' }}>
                      {openHouse.agent.email}
                    </p>
                    {openHouse.agent.telefono && (
                      <p className="text-sm" style={{ color: 'var(--text-gray)' }}>
                        📞 {openHouse.agent.telefono}
                      </p>
                    )}
                  </div>
                </div>

                {openHouse.descrizione && (
                  <div className="mb-6">
                    <h3 className="font-semibold mb-2" style={{ color: 'var(--primary-blue)' }}>
                      Note aggiuntive
                    </h3>
                    <p style={{ color: 'var(--text-dark)' }}>{openHouse.descrizione}</p>
                  </div>
                )}

                {/* Time Slots */}
                <div>
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-dark)' }}>
                    Scegli il tuo slot di visita
                  </h3>

                  {timeSlots.length === 0 ? (
                    <div className="text-center py-8">
                      <p style={{ color: 'var(--text-gray)' }}>
                        Nessun slot disponibile per questo Open House.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {timeSlots.map((slot) => {
                        // Determina se uno slot è pieno (tutti i posti occupati)
                        const isSlotOccupied = slot.posti_occupati >= slot.posti_disponibili

                        // Debug log per verificare la logica
                        console.log(`Slot ${slot.ora_inizio}-${slot.ora_fine}: occupati=${slot.posti_occupati}, disponibili=${slot.posti_disponibili}, isOccupied=${isSlotOccupied}`)

                        return (
                        <button
                          key={slot.id}
                          onClick={() => handleSlotSelection(slot.id)}
                          disabled={isSlotOccupied}
                          className={`p-4 rounded-lg border-2 transition-all ${
                            isSlotOccupied
                              ? 'bg-red-50 border-red-300 cursor-not-allowed opacity-70'
                              : selectedSlot === slot.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                          }`}
                        >
                          <div className={`font-medium ${
                            isSlotOccupied
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}>
                            {formatTime(slot.ora_inizio)} - {formatTime(slot.ora_fine)}
                          </div>
                          <div className={`text-sm mt-1 ${
                            isSlotOccupied
                              ? 'text-red-500'
                              : 'text-gray-600'
                          }`}>
                            {isSlotOccupied
                              ? 'Non Disponibile'
                              : 'Disponibile'
                            }
                          </div>
                        </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Booking Form */}
            <div>
              {showBookingForm && selectedSlot && (
                <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
                  <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-dark)' }}>
                    Completa la prenotazione
                  </h3>

                  <form onSubmit={handleFormSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>
                          Nome *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>
                          Cognome *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.cognome}
                          onChange={(e) => setFormData({ ...formData, cognome: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>
                        Telefono *
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.telefono}
                        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-dark)' }}>
                        Messaggio (opzionale)
                      </label>
                      <textarea
                        rows={3}
                        value={formData.messaggio}
                        onChange={(e) => setFormData({ ...formData, messaggio: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Domande o richieste speciali..."
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={formData.privacy_accepted}
                          onChange={(e) => setFormData({ ...formData, privacy_accepted: e.target.checked })}
                          className="mt-1"
                        />
                        <span className="text-sm" style={{ color: 'var(--text-dark)' }}>
                          Accetto l'<a href="#" className="text-blue-600 underline">informativa privacy</a> e
                          autorizzo il trattamento dei dati personali per la gestione della prenotazione. *
                        </span>
                      </label>

                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={formData.marketing_accepted}
                          onChange={(e) => setFormData({ ...formData, marketing_accepted: e.target.checked })}
                          className="mt-1"
                        />
                        <span className="text-sm" style={{ color: 'var(--text-dark)' }}>
                          Accetto di ricevere comunicazioni commerciali e newsletter da Ghergo Immobiliare.
                        </span>
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full btn-primary py-3 font-semibold disabled:opacity-50"
                    >
                      {submitting ? 'Prenotazione in corso...' : 'CONFERMA PRENOTAZIONE'}
                    </button>

                    <p className="text-xs text-center" style={{ color: 'var(--text-gray)' }}>
                      Dopo la conferma verrai reindirizzato al questionario di prequalifica
                      e riceverai via email la brochure dell'immobile.
                    </p>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}