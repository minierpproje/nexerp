'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewDealerPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [form, setForm] = useState({
    code: '', name: '', email: '', phone: '', region: '', payment_terms: '30'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', slug)
      .eq('owner_id', user.id)
      .single()

    if (!tenantData) { setError('Tenant bulunamadı.'); setLoading(false); return }

    const { error: insertError } = await supabase.from('dealers').insert({
      tenant_id: tenantData.id,
      code: form.code,
      name: form.name,
      email: form.email,
      phone: form.phone,
      region: form.region,
      payment_terms: parseInt(form.payment_terms) || 30,
      status: 'ACTIVE',
    })

    if (insertError) {
      setError('Bu kod zaten kullanımda.')
      setLoading(false)
      return
    }

    router.push(`/${slug}/dealers`)
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
      <div style={{ width: 480, background: 'white', borderRadius: 14, padding: 32, border: '1px solid rgba(15,15,15,0.1)' }}>
        <Link href={`/${slug}/dealers`} style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← Bayiler</Link>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 24, marginTop: 12 }}>Yeni Bayi</h1>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Kod *</label>
              <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required placeholder="ANK-001" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Vade (gün)</label>
              <input type="number" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Firma Adı *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Ankara Dağıtım A.Ş." style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>E-posta</label>
              <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="bayi@firma.com" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Telefon</label>
              <input type="text" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="0532 000 0000" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Bölge</label>
            <input type="text" value={form.region} onChange={e => setForm({ ...form, region: e.target.value })} placeholder="Ankara" style={inputStyle} />
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Kaydediliyor...' : 'Bayi Ekle'}
          </button>
        </form>
      </div>
    </div>
  )
}