'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Level = { id: string; name: string; sort_order: number }
type LevelValue = { id: string; name: string }

export default function EditProductPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const id = params.id as string
  const supabase = createClient()

  const [form, setForm] = useState({ code: '', name: '', unit: 'Adet', base_price: '', vat_rate: '20' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [levels, setLevels] = useState<Level[]>([])
  const [levelValues, setLevelValues] = useState<Record<string, LevelValue[]>>({})
  const [catData, setCatData] = useState<Record<string, string>>({})
  const [customMode, setCustomMode] = useState<Record<string, boolean>>({})
  const [savingCat, setSavingCat] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      if (!user) { router.push(`/${slug}/login`); return }

      const { data: tenant } = await supabase.from('tenants').select('id').eq('slug', slug).single()
      if (!tenant) return
      setTenantId(tenant.id)

      const [{ data: product }, { data: lvls }] = await Promise.all([
        supabase.from('dealer_products').select('*').eq('id', id).single(),
        supabase.from('product_category_levels').select('id, name, sort_order').eq('tenant_id', tenant.id).order('sort_order'),
      ])

      if (!product) { router.push(`/${slug}/products`); return }

      setForm({
        code: product.code || '',
        name: product.name || '',
        unit: product.unit || 'Adet',
        base_price: product.base_price?.toString() || '',
        vat_rate: product.vat_rate?.toString() || '20',
      })
      setCatData((product.category_data as Record<string, string>) || {})

      if (lvls && lvls.length > 0) {
        setLevels(lvls)
        const entries = await Promise.all(lvls.map(async l => {
          const { data } = await supabase
            .from('product_category_values').select('id, name')
            .eq('tenant_id', tenant.id).eq('level_id', l.id).order('name')
          return [l.id, data || []] as [string, LevelValue[]]
        }))
        setLevelValues(Object.fromEntries(entries))
      }

      setLoading(false)
    }
    load()
  }, [slug, id])

  async function handleAddValue(levelId: string) {
    const name = (catData[levelId] || '').trim()
    if (!name || !tenantId || savingCat) return
    setSavingCat(levelId)
    await supabase.from('product_category_values').insert({ tenant_id: tenantId, level_id: levelId, name })
    const { data } = await supabase
      .from('product_category_values').select('id, name')
      .eq('tenant_id', tenantId).eq('level_id', levelId).order('name')
    setLevelValues(prev => ({ ...prev, [levelId]: data || [] }))
    setCustomMode(prev => ({ ...prev, [levelId]: false }))
    setSavingCat(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const categoryLabel = levels.map(l => catData[l.id] || '').filter(Boolean).join(' / ')

    const { error: updateError } = await supabase.from('dealer_products').update({
      code: form.code,
      name: form.name,
      category: categoryLabel,
      category_data: catData,
      unit: form.unit,
      base_price: parseFloat(form.base_price),
      vat_rate: parseFloat(form.vat_rate),
    }).eq('id', id)

    if (updateError) {
      setError('Kayıt sırasında bir hata oluştu.')
      setSaving(false)
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

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <div style={{ width: 480, background: 'white', borderRadius: 14, padding: 32, border: '1px solid rgba(15,15,15,0.1)' }}>
        <Link href={`/${slug}/products`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(15,15,15,0.07)', borderRadius: 8, fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 500 }}>← Ürünler</Link>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, marginBottom: 24, marginTop: 12 }}>Ürünü Düzenle</h1>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Kod *</label>
              <input type="text" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required placeholder="PRD-001" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Ürün Adı *</label>
              <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required placeholder="Deterjan 5L" style={inputStyle} />
            </div>
          </div>

          {levels.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: levels.length === 1 ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
              {levels.map(level => {
                const opts = levelValues[level.id] || []
                const isCustom = customMode[level.id]
                const val = catData[level.id] || ''
                return (
                  <div key={level.id}>
                    <label style={labelStyle}>{level.name}</label>
                    {opts.length > 0 && !isCustom ? (
                      <select value={val} onChange={e => {
                        if (e.target.value === '__custom__') {
                          setCustomMode(prev => ({ ...prev, [level.id]: true }))
                          setCatData(prev => ({ ...prev, [level.id]: '' }))
                        } else {
                          setCatData(prev => ({ ...prev, [level.id]: e.target.value }))
                        }
                      }} style={inputStyle}>
                        <option value="">— Seçin —</option>
                        {opts.map(o => <option key={o.id} value={o.name}>{o.name}</option>)}
                        <option value="__custom__">+ Yeni ekle...</option>
                      </select>
                    ) : (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="text" value={val}
                          onChange={e => setCatData(prev => ({ ...prev, [level.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddValue(level.id))}
                          placeholder={level.name + ' adı'}
                          style={{ ...inputStyle, flex: 1 }} autoFocus={isCustom} />
                        <button type="button" onClick={() => handleAddValue(level.id)}
                          disabled={!val.trim() || savingCat === level.id}
                          style={{ padding: '0 12px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: val.trim() ? 'pointer' : 'not-allowed', opacity: val.trim() ? 1 : 0.4, whiteSpace: 'nowrap' }}>
                          {savingCat === level.id ? '...' : 'Ekle'}
                        </button>
                        {opts.length > 0 && (
                          <button type="button" onClick={() => { setCustomMode(prev => ({ ...prev, [level.id]: false })); setCatData(prev => ({ ...prev, [level.id]: '' })) }}
                            style={{ padding: '0 10px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, background: 'white', cursor: 'pointer', fontSize: 16, color: '#888' }}>x</button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
            <div>
              <label style={labelStyle}>Birim</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} style={inputStyle}>
                <option>Adet</option><option>Koli</option><option>Kg</option><option>Lt</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Fiyat (₺) *</label>
              <input type="number" value={form.base_price} onChange={e => setForm({ ...form, base_price: e.target.value })} required placeholder="245" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>KDV (%)</label>
              <select value={form.vat_rate} onChange={e => setForm({ ...form, vat_rate: e.target.value })} style={inputStyle}>
                <option value="20">%20</option><option value="10">%10</option><option value="0">%0</option>
              </select>
            </div>
          </div>

          <button type="submit" disabled={saving}
            style={{ width: '100%', padding: 12, background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </button>
        </form>
      </div>
    </div>
  )
}
