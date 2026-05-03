'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''

export default function TenantLoginPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !data.user) {
      setError('E-posta veya şifre hatalı.')
      setLoading(false)
      return
    }

    const user = data.user

    // Super admin
    if ((SUPER_ADMIN_EMAIL && user.email === SUPER_ADMIN_EMAIL)) {
      router.push('/dashboard')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin, tenant_id')
      .eq('id', user.id)
      .single()

    if (profile?.is_super_admin) {
      router.push('/dashboard')
      return
    }

    // Bu slug'ın tenant ID'sini bul
    const { data: thisTenant } = await supabase
      .from('tenants')
      .select('id, owner_id')
      .eq('slug', slug)
      .single()

    if (!thisTenant) {
      await supabase.auth.signOut()
      setError('Bu sistem bulunamadı.')
      setLoading(false)
      return
    }

    // Bu slug'ın sahibi mi?
    if (thisTenant.owner_id === user.id) {
      router.push(`/${slug}`)
      return
    }

    // Bu tenant'ın bayisi mi? (profile üzerinden)
    if (profile?.tenant_id === thisTenant.id) {
      router.push(`/${slug}/orders`)
      return
    }

    // Dealers tablosunda bu tenant altında mı?
    const { data: dealer } = await supabase
      .from('dealers')
      .select('tenant_id')
      .eq('email', user.email)
      .maybeSingle()

    if (dealer?.tenant_id === thisTenant.id) {
      router.push(`/${slug}/orders`)
      return
    }

    // Farklı bir tenant'a bayi mi? O zaman kendi tenant'ına yönlendir
    if (dealer?.tenant_id) {
      const { data: actualTenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', dealer.tenant_id)
        .single()
      if (actualTenant?.slug) {
        router.push(`/${actualTenant.slug}/orders`)
        return
      }
    }

    if (profile?.tenant_id && profile.tenant_id !== thisTenant.id) {
      const { data: actualTenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', profile.tenant_id)
        .single()
      if (actualTenant?.slug) {
        router.push(`/${actualTenant.slug}/orders`)
        return
      }
    }

    // Bu sistemde erişim yetkisi yok
    await supabase.auth.signOut()
    setError('Bu hesabın bu sisteme erişim yetkisi bulunmuyor.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <div style={{ width: 360, background: 'white', borderRadius: 14, padding: 32, border: '1px solid rgba(15,15,15,0.1)' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2d7a57', marginBottom: 8 }}>{slug}</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 6 }}>Giriş Yap</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Hesabınıza giriş yapın.</p>
        <Link href="/" style={{ display: 'inline-block', fontSize: 12, color: '#aaa', textDecoration: 'none', marginBottom: 16 }}>← Anasayfa</Link>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>E-posta</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="bayi@firma.com"
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
      </div>
    </div>
  )
}
