'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OnboardPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [phone, setPhone] = useState('')
  const [region, setRegion] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [userId, setUserId] = useState('')
  const [dealerId, setDealerId] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session: _authSession } } = await supabase.auth.getSession()
    const user = _authSession?.user ?? null
    if (!user) { router.push(`/${slug}/login`); return }
    setUserId(user.id)

    const { data: tenant } = await supabase.from('tenants').select('name').eq('slug', slug).single()
    if (tenant) setTenantName(tenant.name)

    const { data: profile } = await supabase.from('profiles').select('phone').eq('id', user.id).single()
    if (profile?.phone) { router.push(`/${slug}/orders`); return }

    const { data: dealer } = await supabase.from('dealers').select('id, region')
      .eq('email', user.email!).single()
    if (dealer) {
      setDealerId(dealer.id)
      setRegion(dealer.region || '')
    }

    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword !== confirmPassword) { setError('Şifreler eşleşmiyor.'); return }
    if (newPassword.length < 8) { setError('Şifre en az 8 karakter olmalı.'); return }

    setSaving(true)

    await supabase.from('profiles').update({ phone }).eq('id', userId)

    if (dealerId) {
      await supabase.from('dealers').update({ phone, region }).eq('id', dealerId)
    }

    const { error: passError } = await supabase.auth.updateUser({ password: newPassword })
    if (passError) { setError('Şifre güncellenemedi: ' + passError.message); setSaving(false); return }

    router.push(`/${slug}/orders`)
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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec', padding: '32px' }}>
      <div style={{ width: 440, background: 'white', borderRadius: 14, padding: 32, border: '1px solid rgba(15,15,15,0.1)' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2d7a57', marginBottom: 8 }}>{tenantName}</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 6 }}>Hesabınızı Tamamlayın</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Telefon numaranızı girin ve güvenli bir şifre belirleyin.</p>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Telefon *</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} required placeholder="0532 000 0000" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Bölge</label>
            <input type="text" value={region} onChange={e => setRegion(e.target.value)} placeholder="İstanbul" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14, borderTop: '1px solid rgba(15,15,15,0.08)', paddingTop: 20, marginTop: 20 }}>
            <label style={labelStyle}>Yeni Şifre *</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} placeholder="Min. 8 karakter" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Şifre Tekrar *</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Şifreyi tekrar gir" style={inputStyle} />
          </div>
          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: 12, background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Kaydediliyor...' : 'Devam Et →'}
          </button>
        </form>
      </div>
    </div>
  )
}
