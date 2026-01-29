'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/auth'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const { refreshAuth } = useAuth()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { user, agent } = await signIn(email, password)

      if (!agent || !isAdmin(agent)) {
        setError('Accesso negato. Solo gli amministratori possono accedere.')
        return
      }

      await refreshAuth()
      router.push('/admin/dashboard')
    } catch (err: any) {
      setError(err.message || 'Errore durante il login')
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
            Area Amministratore
          </h2>
          <p style={{ color: 'var(--text-gray)' }}>
            Accedi per gestire agenti e contenuti
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: 'var(--light-gray)' }}
                placeholder="dghergo@ghergoimmobiliare.com"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2" style={{ color: 'var(--text-dark)' }}>
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: 'var(--light-gray)' }}
                placeholder="••••••••"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-secondary py-3 nav-text text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'ACCESSO IN CORSO...' : 'ACCEDI COME ADMIN'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <a
              href="/dashboard/login"
              className="text-sm"
              style={{ color: 'var(--accent-blue)' }}
            >
              Sei un agente? Accedi qui
            </a>
          </div>
        </div>

        <div className="text-center mt-6">
          <a
            href="/"
            className="text-sm"
            style={{ color: 'var(--text-gray)' }}
          >
            ← Torna alla homepage
          </a>
        </div>
      </div>
    </div>
  )
}