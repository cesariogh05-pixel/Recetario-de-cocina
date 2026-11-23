'use client'

import { useEffect, useState } from 'react'

export default function RegistrarSW() {
  const [sinConexion, setSinConexion] = useState(false)

  useEffect(() => {
    // Verificar que el navegador soporte Service Workers
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrado con éxito en:', registration.scope)
        })
        .catch((error) => {
          console.error('Error al registrar el Service Worker:', error)
        })
    }

    // Aviso en pantalla cuando se pierde o regresa el internet
    const actualizar = () => setSinConexion(!navigator.onLine)
    actualizar()
    window.addEventListener('online', actualizar)
    window.addEventListener('offline', actualizar)
    return () => {
      window.removeEventListener('online', actualizar)
      window.removeEventListener('offline', actualizar)
    }
  }, [])

  if (!sinConexion) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        background: '#603B2A',
        color: '#FAF6EA',
        padding: '8px 16px',
        borderRadius: 999,
        fontSize: 14,
        zIndex: 9999,
      }}
    >
      Sin conexión: mostrando contenido guardado
    </div>
  )
}
