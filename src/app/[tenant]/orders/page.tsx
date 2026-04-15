'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TenantOrdersPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [tenantId, setTenantId] = useState('')
  const [dealerId, setDealerId] = useState('')
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [lines, setLines] = useState<any[]>([])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase
      .from('tenants').select('id').eq('slug', slug).single()
    if (!tenantData) { router.push(`/${slug}/login`); return }
    setTenantId(tenantData.id)

    const { data: profileData } = await supabase
      .from('profiles').select('*').eq('id', user.id).single()
    setProfile(profileData)

    const { data: dealerData } = await supabase
      .from('dealers').select('id, name')
      .eq('tenant_id', tenantData.id)
      .eq('email', user.email)
      .single()
    if (dealerData) setDealerId(dealerData.id)

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, dealers(name)')
      .eq('tenant_id', tenantData.id)
      .order('created_at', { ascending: false })
    setOrders(ordersData || [])

    const { data: productsData } = await supabase
      .from('dealer_products')
      .select('*')
      .eq('tenant_id', tenantData.id)
      .eq('status', 'ACTIVE')
    setProducts(productsData || [])

    setLoading(false)
  }

  function addLine() {
    setLines([...lines, { product_id: '', qty: 1 }])
  }

  function updateLine(i: number, field: string, value: any) {
    const updated = [...lines]
    updated[i][field] = value
    setLines(updated)
  }

  function removeLine(i: number) {
    setLines(lines.filter((_, idx) => idx !== i))
  }

  function calcTotal() {
    return lines.reduce((sum, l) => {
      const p = products.find(x => x.id === l.product_id)
      if (!p) return sum
      return sum + p.base_price * l.qty * (1 + p.vat_rate / 100)
    }, 0)
  }

  async function saveOrder() {
    if (!lines.length || lines.some(l => !l.product_id)) return
    setSaving(true)

    const count = orders.length + 1
    const orderNo = `ORD-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`

    let subtotal = 0, vatAmount = 0
    lines.forEach(l => {
      const p = products.find(x => x.id === l.product_id)
      if (p) {
        subtotal += p.base_price * l.qty
        vatAmount += p.base_price * l.qty * (p.vat_rate / 100)
      }
    })

    const { data: newOrder } = await supabase.from('orders').insert({
      tenant_id: tenantId,
      dealer_id: dealerId || undefined,
      order_no: orderNo,
      status: 'PENDING',
      note,
      subtotal,
      vat_amount: vatAmount,
      total: subtotal + vatAmount,
    }).select().single()

    if (newOrder) {
      for (const l of lines) {
        const p = products.find(x => x.id === l.product_id)
        if (p) {
          await supabase.from('order_items').insert({
            order_id: newOrder.id,
            product_id: l.product_id,
            quantity: l.qty,
            unit_price: p.base_price,
            vat_rate: p.vat_rate,
            line_total: p.base_price * l.qty,
          })
        }
      }
    }

    setLines([])
    setNote('')
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  const statusLabel: Record<string, string> = {
    PENDING: 'Onay Bekliyor', CONFIRMED: 'Onaylandı',
    PROCESSING: 'Hazırlanıyor', SHIPPED: 'Kargoda',
    DELIVERED: 'Teslim Edildi', CANCELLED: 'İptal',
  }
  const statusColor: Record<string, { bg: string; color: string }> = {
    PENDING: { bg: '#fdf3e0', color: '#b87d1a' },
    CONFIRMED: { bg: '#e8f0fb', color: '#2563a8' },
    PROCESSING: { bg: '#f3e8ff', color: '#6b21a8' },
    SHIPPED: { bg: '#e0f2fe', color: '#0c4a6e' },
    DELIVERED: { bg: '#f0fdf4', color: '#16a34a' },
    CANCELLED: { bg: '#fef2f2', color: '#dc2626' },
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2d7a57', marginBottom: 4 }}>{slug}</div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1 }}>Siparişlerim</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setShowForm(!showForm); setLines([]) }}
              style={{ padding: '9px 18px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {showForm ? 'İptal' : '+ Yeni Sipariş'}
            </button>
            <button onClick={async () => {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  await supabase.auth.signOut()
  window.location.href = `/${slug}/login`
}} style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
  Çıkış
</button>
          </div>
        </div>

        {showForm && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, marginBottom: 20 }}>Yeni Sipariş</h2>

            {lines.map((l, i) => {
              const p = products.find(x => x.id === l.product_id)
              return (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                  <select value={l.product_id} onChange={e => updateLine(i, 'product_id', e.target.value)}
                    style={{ flex: 1, padding: '9px 10px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                    <option value="">— Ürün seçin —</option>
                    {products.map((pr: any) => (
                      <option key={pr.id} value={pr.id}>{pr.name} — ₺{Number(pr.base_price).toLocaleString('tr-TR')}/{pr.unit}</option>
                    ))}
                  </select>
                  <input type="number" value={l.qty} min={1} onChange={e => updateLine(i, 'qty', parseInt(e.target.value) || 1)}
                    style={{ width: 70, padding: '9px 10px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', textAlign: 'center' }} />
                  {p && <span style={{ fontSize: 13, color: '#888', minWidth: 80, textAlign: 'right' }}>₺{(p.base_price * l.qty * (1 + p.vat_rate / 100)).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</span>}
                  <button onClick={() => removeLine(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18 }}>×</button>
                </div>
              )
            })}

            <button onClick={addLine}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px dashed rgba(15,15,15,0.2)', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#888', marginBottom: 16 }}>
              + Ürün Ekle
            </button>

            {lines.length > 0 && (
              <div style={{ background: '#f5f2ec', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#888' }}>Toplam (KDV dahil)</span>
                <span style={{ fontWeight: 500 }}>₺{calcTotal().toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</span>
              </div>
            )}

            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Sipariş notu (opsiyonel)"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />

            <button onClick={saveOrder} disabled={saving || !lines.length}
              style={{ padding: '10px 24px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving || !lines.length ? 0.5 : 1 }}>
              {saving ? 'Kaydediliyor...' : 'Siparişi Gönder'}
            </button>
          </div>
        )}

        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ec' }}>
                {['Sipariş No', 'Tarih', 'KDV Hariç', 'KDV', 'Toplam', 'Not', 'Durum'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Henüz sipariş yok</td></tr>
              ) : (
                orders.map((o: any) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(15,15,15,0.06)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{o.order_no}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{new Date(o.created_at).toLocaleDateString('tr-TR')}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>₺{Number(o.subtotal).toLocaleString('tr-TR')}</td>
<td style={{ padding: '12px 16px', color: '#666' }}>₺{Number(o.vat_amount).toLocaleString('tr-TR')}</td>
<td style={{ padding: '12px 16px', fontWeight: 500 }}>₺{Number(o.total).toLocaleString('tr-TR')}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{o.note || '—'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 500, background: statusColor[o.status]?.bg, color: statusColor[o.status]?.color }}>
                        {statusLabel[o.status] || o.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}