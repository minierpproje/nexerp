'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const SUPER_ADMIN_EMAIL = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL || ''

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

    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !data.user) {
      setError('E-posta veya şifre hatalı.')
      setLoading(false)
      return
    }

    const user = data.user

    // Super admin: env'deki email veya is_super_admin flag
    if (SUPER_ADMIN_EMAIL && user.email === SUPER_ADMIN_EMAIL) {
      router.push('/dashboard')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_super_admin, role, tenant_id')
      .eq('id', user.id)
      .single()

    if (profile?.is_super_admin) {
      router.push('/dashboard')
      return
    }

    // Tenant sahibi
    const { data: ownedTenant } = await supabase
      .from('tenants')
      .select('slug')
      .eq('owner_id', user.id)
      .single()

    if (ownedTenant?.slug) {
      router.push(`/${ownedTenant.slug}`)
      return
    }

    // Bayi: profile.tenant_id üzerinden
    if (profile?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', profile.tenant_id)
        .single()

      if (tenant?.slug) {
        router.push(`/${tenant.slug}/orders`)
        return
      }
    }

    // Bayi: dealers tablosunda email eşleşmesi (fallback)
    const { data: dealer } = await supabase
      .from('dealers')
      .select('tenant_id')
      .eq('email', user.email)
      .maybeSingle()

    if (dealer?.tenant_id) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('slug')
        .eq('id', dealer.tenant_id)
        .single()

      if (tenant?.slug) {
        router.push(`/${tenant.slug}/orders`)
        return
      }
    }

    // Hesap var ama hiçbir yere bağlı değil
    await supabase.auth.signOut()
    setError('Bu hesap herhangi bir sisteme bağlı değil. Lütfen yöneticinizle iletişime geçin.')
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <div style={{ width: 360, background: 'white', borderRadius: 14, padding: 32, border: '1px solid rgba(15,15,15,0.1)' }}>
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2d7a57', marginBottom: 8 }}>SimpleORder</div>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 6 }}>Giriş Yap</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Hesabınıza giriş yapın.</p>

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
