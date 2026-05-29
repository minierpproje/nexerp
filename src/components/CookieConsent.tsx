'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const pref = localStorage.getItem('cookie_consent')
    if (!pref) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('cookie_consent', 'accepted')
    setVisible(false)
  }

  const reject = () => {
    localStorage.setItem('cookie_consent', 'essential_only')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      background: '#0f0f0f',
      color: '#f0f0f0',
      padding: '20px 5vw',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '16px',
      justifyContent: 'space-between',
      boxShadow: '0 -2px 20px rgba(0,0,0,0.3)',
      borderTop: '1px solid rgba(255,255,255,0.1)',
    }}>
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <p style={{ fontSize: 13, fontFamily: 'sans-serif', lineHeight: 1.7, color: 'rgba(240,240,240,0.85)' }}>
          Bu site, yalnızca zorunlu oturum çerezleri kullanmaktadır. Analitik veya reklam çerezi kullanılmamaktadır.{' '}
          <Link href="/gizlilik" style={{ color: '#4ade80', textDecoration: 'underline' }}>
            Gizlilik Politikası
          </Link>{' '}
          sayfamızdan detaylı bilgi alabilirsiniz.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
        <button
          onClick={reject}
          style={{
            padding: '8px 18px',
            fontSize: 13,
            fontFamily: 'sans-serif',
            cursor: 'pointer',
            border: '1px solid rgba(240,240,240,0.3)',
            borderRadius: 6,
            background: 'transparent',
            color: 'rgba(240,240,240,0.7)',
            transition: 'all 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.borderColor = 'rgba(240,240,240,0.6)')}
          onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(240,240,240,0.3)')}
        >
          Yalnızca Zorunlu
        </button>
        <button
          onClick={accept}
          style={{
            padding: '8px 20px',
            fontSize: 13,
            fontFamily: 'sans-serif',
            cursor: 'pointer',
            border: 'none',
            borderRadius: 6,
            background: '#2d7a57',
            color: '#fff',
            fontWeight: 500,
            transition: 'background 0.15s',
          }}
          onMouseOver={e => (e.currentTarget.style.background = '#236045')}
          onMouseOut={e => (e.currentTarget.style.background = '#2d7a57')}
        >
          Kabul Et
        </button>
      </div>
    </div>
  )
}
