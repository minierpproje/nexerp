'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function DealerProfilePage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [successInfo, setSuccessInfo] = useState(false)
  const [successPassword, setSuccessPassword] = useState(false)
  const [error, setError] = useState('')
  const [passwordError, setPasswordError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session: _authSession } } = await supabase.auth.getSession()
    const user = _authSession?.user ?? null
    if (!user) { router.push(`/${slug}/login`); return }

    setEmail(user.email || '')

    const { data: profile } = await supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
    if (profile) {
      setFullName(profile.full_name || '')
      setPhone(profile.phone || '')
    }

    setLoading(false)
  }

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const { data: { session: _authSession } } = await supabase.auth.getSession()
    const user = _authSession?.user ?? null
    if (!user) return

    await supabase.from('profiles').update({ full_name: fullName, phone }).eq('id', user.id)

    if (email !== user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email })
      if (emailError) {
        setError('E-posta güncellenirken hata: ' + emailError.message)
        setSaving(false)
        return
      }
    }

    setSaving(false)
    setSuccessInfo(true)
    setTimeout(() => setSuccessInfo(false), 3000)
  }

  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Şifreler eşleşmiyor.')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Şifre en az 8 karakter olmalı.')
      return
    }

    setSavingPassword(true)
    const { error: passError } = await supabase.auth.updateUser({ password: newPassword })

    if (passError) {
      setPasswordError('Şifre güncellenirken hata: ' + passError.message)
      setSavingPassword(false)
      return
    }

    setNewPassword('')
    setConfirmPassword('')
    setSavingPassword(false)
    setSuccessPassword(true)
    setTimeout(() => setSuccessPassword(false), 3000)
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
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>

        <Link href={`/${slug}/orders`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(15,15,15,0.07)', borderRadius: 8, fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 500 }}>← Siparişler</Link>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginTop: 8, marginBottom: 28 }}>Profilim</h1>

        {/* Kişisel Bilgiler */}
        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 28, marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 17, marginBottom: 20 }}>Kişisel Bilgiler</h2>

          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
          {successInfo && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>Bilgiler güncellendi.</div>}

          <form onSubmit={handleSaveInfo}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Ad Soyad</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>E-posta</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
              <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Değiştirilirse doğrulama maili gönderilir.</p>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Telefon</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="0532 000 0000" style={inputStyle} />
            </div>
            <button type="submit" disabled={saving}
              style={{ padding: '10px 24px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        </div>

        {/* Şifre Değiştir */}
        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 28 }}>
          <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 17, marginBottom: 20 }}>Şifre Değiştir</h2>

          {passwordError && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{passwordError}</div>}
          {successPassword && <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>Şifre güncellendi.</div>}

          <form onSubmit={handleSavePassword}>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Yeni Şifre</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required minLength={8} placeholder="Min. 8 karakter" style={inputStyle} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Şifre Tekrar</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Şifreyi tekrar gir" style={inputStyle} />
            </div>
            <button type="submit" disabled={savingPassword}
              style={{ padding: '10px 24px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: savingPassword ? 'not-allowed' : 'pointer', opacity: savingPassword ? 0.6 : 1 }}>
              {savingPassword ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
            </button>
          </form>
        </div>

      </div>
    </div>
  )
}
