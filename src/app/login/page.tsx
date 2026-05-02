'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function PlatformLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-posta veya şifre hatalı.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <div style={{ width: 360, background: 'white', borderRadius: 14, padding: 32, border: '1px solid rgba(15,15,15,0.1)' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2d7a57', marginBottom: 8 }}>SimpleORder</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 6 }}>Platform Girişi</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Platform yönetici hesabı.</p>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>E-posta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="ornek@firma.com"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Şifre</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••"
              style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 }}>
          Hesabın yok mu? <Link href="/register" style={{ color: '#0f0f0f', fontWeight: 500 }}>Kayıt ol</Link>
        </p>
      </div>
    </div>
  )
}