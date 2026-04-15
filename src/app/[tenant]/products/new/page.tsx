'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function NewProductPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [form, setForm] = useState({
    code: '', name: '', category: '', unit: 'Adet', base_price: '', vat_rate: '20'
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

    const { error: insertError } = await supabase.from('dealer_products').insert({
      tenant_id: tenantData.id,
      code: form.code,
      name: form.name,
      category: form.category,
      unit: form.unit,
      base_price: parseFloat(form.base_price),
      vat_rate: parseFloat(form.vat_rate),
      status: 'ACTIVE',
    })

    if (insertError) {
      setError('Bu kod zaten kullanımda.')
      setLoading(false)
      return
    }

    router.push(`/${slug}/products`)
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
        <Link href={`/${slug}/products`} style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← Ürünler</Link>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 24, marginTop: 12 }}>Yeni Ürün</h1>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Kod *</label>
              <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required placeholder="PRD-001" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Kategori</label>
              <input type="text" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Temizlik" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Ürün Adı *</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Deterjan 5L" style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>Birim</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={inputStyle}>
                <option>Adet</option>
                <option>Koli</option>
                <option>Kg</option>
                <option>Lt</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fiyat (₺) *</label>
              <input type="number" value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} required placeholder="245" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>KDV (%)</label>
              <select value={form.vat_rate} onChange={e => setForm({ ...form, vat_rate: e.target.value })} style={inputStyle}>
                <option value="20">%20</option>
                <option value="10">%10</option>
                <option value="0">%0</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 12, background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Kaydediliyor...' : 'Ürün Ekle'}
          </button>
        </form>
      </div>
    </div>
  )
}