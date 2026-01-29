'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const { agent, refreshAuth } = useAuth()

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validazioni
      if (newPassword.length < 8) {
        throw new Error('La password deve essere di almeno 8 caratteri')
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Le password non coincidono')
      }

      // Cambia password in Supabase Auth
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (passwordError) throw passwordError

      // Aggiorna flag nel database
      if (agent) {
        const { error: updateError } = await supabase
          .from('gre_agents')
          .update({ password_changed: true })
          .eq('id', agent.id)

        if (updateError) throw updateError
      }

      await refreshAuth()

      // Reindirizza alla dashboard
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Errore durante il cambio password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center space-x-2 mb-4">
            <h1 className="text-3xl font-bold" style={{ color: 'var(--primary-blue)' }}>
              GHERGO
            </h1>
            <span className="nav-text text-sm" style={{ color: 'var(--text-gray)' }}>
              IMMOBILIARE
            </span>
          </div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-dark)' }}>
            Cambio Password Obbligatorio
          </h2>
          <p style={{ color: 'var(--text-gray)' }}>
            Per la sicurezza del tuo account, devi cambiare la password temporanea
          </p>
        </div>

        {/* Change Password Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleChangePassword} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Benvenuto {agent?.nome}!</strong><br />
                Questa è la tua prima volta. Imposta una password sicura per continuare.
              </p>
            </div>

            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>
                Password Attuale (temporanea)
              </label>
              <input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: 'var(--light-gray)' }}
                placeholder="La password temporanea ricevuta"
                required
              />
            </div>

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>
                Nuova Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: 'var(--light-gray)' }}
                placeholder="Minimo 8 caratteri"
                required
                minLength={8}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>
                Conferma Nuova Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: 'var(--light-gray)' }}
                placeholder="Ripeti la nuova password"
                required
                minLength={8}
              />
            </div>

            <div className="text-sm" style={{ color: 'var(--text-gray)' }}>
              <p><strong>Requisiti password:</strong></p>
              <ul className="list-disc list-inside mt-1">
                <li>Minimo 8 caratteri</li>
                <li>Consigliato: lettere, numeri e simboli</li>
                <li>Non utilizzare password ovvie</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 nav-text text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'AGGIORNAMENTO IN CORSO...' : 'AGGIORNA PASSWORD'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}