'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function TenantRegisterPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 1. Tenant bul
    const { data: tenantData, error: tenantError } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .single()

    if (tenantError || !tenantData) {
      setError('Tenant bulunamadı: ' + slug)
      setLoading(false)
      return
    }

    // 2. Kullanıcı oluştur
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name, role: 'dealer' } },
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message || 'Kayıt sırasında bir hata oluştu.')
      setLoading(false)
      return
    }

    // 3. Profili tenant_id ile güncelle
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: name,
        tenant_id: tenantData.id,
        role: 'dealer',
      })
      .eq('id', data.user.id)

    if (profileError) {
      // upsert dene
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: name,
        tenant_id: tenantData.id,
        role: 'dealer',
      })
    }

    router.push(`/${slug}/orders`)
    router.refresh()
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = {
    display: 'block', fontSize: 11, color: '#888',
    marginBottom: 5, textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <div style={{ width: 380, background: 'white', borderRadius: 14, padding: 32, border: '1px solid rgba(15,15,15,0.1)' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2d7a57', marginBottom: 8 }}>{slug}</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 6 }}>Kayıt Ol</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Bayi hesabı oluştur.</p>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Ad Soyad</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ahmet Yılmaz" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>E-posta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="bayi@firma.com" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Şifre</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} placeholder="Min. 8 karakter" style={inputStyle} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Hesap oluşturuluyor...' : 'Kayıt Ol'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#888', marginTop: 20 }}>
          Zaten hesabın var mı?{' '}
          <Link href={`/${slug}/login`} style={{ color: '#0f0f0f', fontWeight: 500 }}>Giriş yap</Link>
        </p>
      </div>
    </div>
  )
}