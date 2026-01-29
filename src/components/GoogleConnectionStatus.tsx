'use client'

import { useState, useEffect } from 'react'

interface GoogleStatus {
  connected: boolean
  reason?: string
  message: string
  services?: {
    gmail: boolean
    calendar: boolean
  }
}

export default function GoogleConnectionStatus() {
  const [status, setStatus] = useState<GoogleStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [isReconnecting, setIsReconnecting] = useState(false)

  const checkGoogleStatus = async () => {
    try {
      const response = await fetch('/api/auth/google/status')
      const data = await response.json()
      setStatus(data)
    } catch (error) {
      console.error('Error checking Google status:', error)
      setStatus({
        connected: false,
        message: 'Errore nel controllo dello stato'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReconnect = async () => {
    setIsReconnecting(true)
    try {
      // Ottieni nuovo URL di autenticazione
      const response = await fetch('/api/auth/google')
      const data = await response.json()

      if (data.authUrl) {
        // Apri l'URL di autenticazione in una nuova finestra
        window.open(data.authUrl, '_blank', 'width=500,height=600')

        // Aggiorna lo stato dopo alcuni secondi
        setTimeout(() => {
          checkGoogleStatus()
          setIsReconnecting(false)
        }, 3000)
      }
    } catch (error) {
      console.error('Error getting auth URL:', error)
      setIsReconnecting(false)
    }
  }

  useEffect(() => {
    checkGoogleStatus()

    // Ricontrolla ogni 30 secondi
    const interval = setInterval(checkGoogleStatus, 30000)

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">Verificando connessione Google...</span>
        </div>
      </div>
    )
  }

  if (!status) return null

  return (
    <div className={`border rounded-lg p-4 mb-4 ${
      status.connected
        ? 'bg-green-50 border-green-200'
        : 'bg-red-50 border-red-200'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`h-3 w-3 rounded-full ${
            status.connected ? 'bg-green-500' : 'bg-red-500'
          }`}></div>

          <div>
            <div className="font-medium text-sm">
              {status.connected ? '🔗 Google Connesso' : '⚠️ Google Non Connesso'}
            </div>
            <div className={`text-xs ${
              status.connected ? 'text-green-700' : 'text-red-700'
            }`}>
              {status.message}
            </div>
          </div>

          {status.connected && status.services && (
            <div className="flex space-x-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                📧 Gmail
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                📅 Calendar
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={checkGoogleStatus}
            className="text-sm text-gray-500 hover:text-gray-700"
            title="Aggiorna stato"
          >
            🔄
          </button>

          {!status.connected && (
            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            >
              {isReconnecting ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                  Connessione...
                </>
              ) : (
                'Riconnetti'
              )}
            </button>
          )}
        </div>
      </div>

      {!status.connected && status.reason && (
        <div className="mt-2 text-xs text-red-600">
          <strong>Motivo:</strong> {status.reason}
        </div>
      )}
    </div>
  )
}