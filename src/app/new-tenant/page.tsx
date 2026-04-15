'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewTenantPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [module, setModule] = useState('dealer_orders')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '').trim()
    if (!cleanSlug) {
      setError('Geçerli bir URL adı girin.')
      setLoading(false)
      return
    }

    const { error: tenantError } = await supabase.from('tenants').insert({
      slug: cleanSlug,
      name,
      owner_id: user.id,
      module,
      status: 'trial',
    })

    if (tenantError) {
      setError('Bu URL adı zaten alınmış, başka bir tane deneyin.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
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
      <div style={{ width: 440, background: 'white', borderRadius: 14, padding: 32, border: '1px solid rgba(15,15,15,0.1)' }}>
        <Link href="/dashboard" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← Dashboard</Link>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 6, marginTop: 12 }}>Yeni Tenant</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>Müşteri için yeni bir alan oluştur.</p>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Firma / Müşteri Adı</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Ankara Dağıtım A.Ş." style={inputStyle} />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>URL Adı</label>
            <div style={{ display: 'flex', alignItems: 'center', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, overflow: 'hidden' }}>
              <span style={{ padding: '10px 12px', background: '#f5f2ec', fontSize: 13, color: '#888', whiteSpace: 'nowrap' }}>nexerp.com/</span>
              <input type="text" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                required placeholder="ankara-dagitim" style={{ ...inputStyle, border: 'none', borderRadius: 0 }} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Modül</label>
            <select value={module} onChange={e => setModule(e.target.value)} style={inputStyle}>
              <option value="dealer_orders">Bayi Sipariş Yönetimi</option>
              <option value="inventory">Stok Yönetimi</option>
              <option value="activity">Aktivite Yönetimi</option>
            </select>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Oluşturuluyor...' : 'Tenant Oluştur'}
          </button>
        </form>
      </div>
    </div>
  )
}