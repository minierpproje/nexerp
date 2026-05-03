'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Dealer = { id: string; code: string; name: string; email: string; phone: string; region: string; payment_terms: number; status: string; category_id: string | null }
type Branch = { id: string; name: string; address: string | null; contact_person: string | null; phone: string | null }
type DealerPrice = { id: string; product_id: string; price: number; dealer_products: { name: string; base_price: number; unit: string } }
type DealerPayment = { id: string; amount: number; note: string | null; created_at: string }
type ProductQuotaRow = { product_id: string; product_name: string; unit: string; value: string }
type Category = {
  id: string; name: string
  rules: {
    total_quota?: { value: number; unit: string } | null
    product_quotas?: { product_id: string; product_name: string; unit: string; value: number }[]
    amount_quota?: number | null
    product_quota?: number | null
    product_quota_unit?: string | null
  }
}

const emptyForm = { name: '', total_quota_enabled: false, total_quota_value: '', total_quota_unit: '', product_quotas_enabled: false, amount_quota_enabled: false, amount_quota: '' }

export default function TenantDealersPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [tenantId, setTenantId] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [branches, setBranches] = useState<Record<string, Branch[]>>({})
  const [dealerPrices, setDealerPrices] = useState<Record<string, DealerPrice[]>>({})
  const [dealerPayments, setDealerPayments] = useState<Record<string, DealerPayment[]>>({})
  const [dealerKota, setDealerKota] = useState<Record<string, { byProduct: Record<string, number>; totalQty: number }>>({})
  const [dealerBalance, setDealerBalance] = useState<Record<string, { ordersTotal: number; paid: number }>>({})
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<{ id: string; name: string; unit: string }[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedTab, setExpandedTab] = useState<Record<string, 'branches' | 'prices' | 'kota'>>({})
  const [loadingBranches, setLoadingBranches] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCatPanel, setShowCatPanel] = useState(false)
  const [catForm, setCatForm] = useState(emptyForm)
  const [pqRows, setPqRows] = useState<ProductQuotaRow[]>([])
  const [savingCat, setSavingCat] = useState(false)
  const [priceForm, setPriceForm] = useState<Record<string, { product_id: string; price: string }>>({})
  const [savingPrice, setSavingPrice] = useState<string | null>(null)
  const [paymentForm, setPaymentForm] = useState<Record<string, { amount: string; note: string }>>({})
  const [savingPayment, setSavingPayment] = useState<string | null>(null)
  const [dealerOrders, setDealerOrders] = useState<Record<string, any[]>>({})
  const [vadeForms, setVadeForms] = useState<Record<string, string>>({})
  const [savingVade, setSavingVade] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/${slug}/login`); return }
    const { data: tenantData } = await supabase.from('tenants').select('id, name').eq('slug', slug).eq('owner_id', user.id).single()
    if (!tenantData) { router.push('/dashboard'); return }
    setTenantId(tenantData.id)
    setTenantName(tenantData.name)

    const [{ data: dealersData }, { data: catsData }, { data: prodsData }, { data: orderTotals }, { data: paymentTotals }] = await Promise.all([
      supabase.from('dealers').select('*').eq('tenant_id', tenantData.id).order('created_at', { ascending: false }),
      supabase.from('dealer_categories').select('*').eq('tenant_id', tenantData.id).order('name'),
      supabase.from('dealer_products').select('id, name, unit').eq('tenant_id', tenantData.id).eq('status', 'ACTIVE').order('name'),
      supabase.from('orders').select('dealer_id, total').eq('tenant_id', tenantData.id).not('status', 'in', '("DELIVERED","CANCELLED")'),
      supabase.from('dealer_payments').select('dealer_id, amount').eq('tenant_id', tenantData.id),
    ])

    setDealers(dealersData || [])
    setCategories(catsData || [])
    setProducts(prodsData || [])

    const balance: Record<string, { ordersTotal: number; paid: number }> = {}
    ;(orderTotals || []).forEach((o: any) => {
      if (!balance[o.dealer_id]) balance[o.dealer_id] = { ordersTotal: 0, paid: 0 }
      balance[o.dealer_id].ordersTotal += Number(o.total)
    })
    ;(paymentTotals || []).forEach((p: any) => {
      if (!balance[p.dealer_id]) balance[p.dealer_id] = { ordersTotal: 0, paid: 0 }
      balance[p.dealer_id].paid += Number(p.amount)
    })
    setDealerBalance(balance)
    setLoading(false)
  }

  const distinctUnits = [...new Set((products || []).map(p => p.unit).filter(Boolean))]

  async function toggleStatus(dealer: Dealer) {
    const newStatus = dealer.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
    await supabase.from('dealers').update({ status: newStatus }).eq('id', dealer.id)
    setDealers(prev => prev.map(d => d.id === dealer.id ? { ...d, status: newStatus } : d))
  }

  async function setCategory(dealerId: string, categoryId: string) {
    await supabase.from('dealers').update({ category_id: categoryId || null }).eq('id', dealerId)
    setDealers(prev => prev.map(d => d.id === dealerId ? { ...d, category_id: categoryId || null } : d))
  }

  async function toggleExpand(dealerId: string) {
    if (expandedId === dealerId) { setExpandedId(null); return }
    setExpandedId(dealerId)
    setExpandedTab(prev => ({ ...prev, [dealerId]: prev[dealerId] || 'branches' }))
    if (!branches[dealerId]) {
      setLoadingBranches(dealerId)
      const { data } = await supabase.from('dealer_branches').select('*').eq('dealer_id', dealerId).order('name')
      setBranches(prev => ({ ...prev, [dealerId]: data || [] }))
      setLoadingBranches(null)
    }
  }

  async function switchTab(dealerId: string, tab: 'branches' | 'prices' | 'kota') {
    setExpandedTab(prev => ({ ...prev, [dealerId]: tab }))
    if (tab === 'prices' && !dealerPrices[dealerId]) await loadPrices(dealerId)
    if (tab === 'kota' && !dealerPayments[dealerId]) await loadKotaAndPayments(dealerId)
  }

  async function loadPrices(dealerId: string) {
    const { data } = await supabase.from('dealer_product_prices').select('id, product_id, price, dealer_products(name, base_price, unit)').eq('dealer_id', dealerId)
    setDealerPrices(prev => ({ ...prev, [dealerId]: (data as any) || [] }))
  }

  async function loadKotaAndPayments(dealerId: string) {
    const [{ data: payments }, { data: activeOrders }, { data: allOrders }] = await Promise.all([
      supabase.from('dealer_payments').select('*').eq('dealer_id', dealerId).order('created_at', { ascending: false }),
      supabase.from('orders').select('id').eq('dealer_id', dealerId).not('status', 'in', '("DELIVERED","CANCELLED")'),
      supabase.from('orders').select('id, order_no, created_at, total, status, payment_status').eq('dealer_id', dealerId).not('status', 'eq', 'CANCELLED').order('created_at', { ascending: true }),
    ])
    setDealerPayments(prev => ({ ...prev, [dealerId]: payments || [] }))
    setDealerOrders(prev => ({ ...prev, [dealerId]: allOrders || [] }))

    if (activeOrders && activeOrders.length > 0) {
      const { data: items } = await supabase.from('order_items').select('product_id, quantity').in('order_id', activeOrders.map((o: any) => o.id))
      const byProduct: Record<string, number> = {}
      let totalQty = 0
      ;(items || []).forEach((item: any) => {
        byProduct[item.product_id] = (byProduct[item.product_id] || 0) + Number(item.quantity)
        totalQty += Number(item.quantity)
      })
      setDealerKota(prev => ({ ...prev, [dealerId]: { byProduct, totalQty } }))
    } else {
      setDealerKota(prev => ({ ...prev, [dealerId]: { byProduct: {}, totalQty: 0 } }))
    }
  }

  async function saveVade(dealerId: string) {
    const val = parseInt(vadeForms[dealerId])
    if (isNaN(val) || val < 0) return
    setSavingVade(dealerId)
    await supabase.from('dealers').update({ payment_terms: val }).eq('id', dealerId)
    setDealers(prev => prev.map(d => d.id === dealerId ? { ...d, payment_terms: val } : d))
    setSavingVade(null)
  }

  async function savePrice(dealerId: string) {
    const f = priceForm[dealerId]
    if (!f?.product_id || !f?.price) return
    setSavingPrice(dealerId)
    await supabase.from('dealer_product_prices').upsert({ tenant_id: tenantId, dealer_id: dealerId, product_id: f.product_id, price: parseFloat(f.price) }, { onConflict: 'tenant_id,dealer_id,product_id' })
    setPriceForm(prev => ({ ...prev, [dealerId]: { product_id: '', price: '' } }))
    await loadPrices(dealerId)
    setSavingPrice(null)
  }

  async function deletePrice(dealerId: string, priceId: string) {
    await supabase.from('dealer_product_prices').delete().eq('id', priceId)
    await loadPrices(dealerId)
  }

  async function savePayment(dealerId: string) {
    const f = paymentForm[dealerId]
    if (!f?.amount) return
    setSavingPayment(dealerId)
    const amount = parseFloat(f.amount)
    await supabase.from('dealer_payments').insert({ tenant_id: tenantId, dealer_id: dealerId, amount, note: f.note?.trim() || null })
    setPaymentForm(prev => ({ ...prev, [dealerId]: { amount: '', note: '' } }))

    // Ödeme dağıtımı: eskiden yeniye siparişlere uygula
    const allPaid = (dealerPayments[dealerId] || []).reduce((s: number, p: any) => s + Number(p.amount), 0) + amount
    const orders = dealerOrders[dealerId] || []
    let remaining = allPaid
    for (const o of orders) {
      const oTotal = Number(o.total)
      let newStatus: string
      if (remaining >= oTotal) { newStatus = 'PAID'; remaining -= oTotal }
      else if (remaining > 0) { newStatus = 'PARTIAL'; remaining = 0 }
      else {
        const vade = dealers.find(d => d.id === dealerId)?.payment_terms ?? 30
        const vadeDate = new Date(o.created_at); vadeDate.setDate(vadeDate.getDate() + vade)
        newStatus = vadeDate < new Date() ? 'LATE' : 'PENDING'
      }
      if (newStatus !== o.payment_status) {
        await supabase.from('orders').update({ payment_status: newStatus }).eq('id', o.id)
      }
    }

    setDealerBalance(prev => {
      const b = prev[dealerId] || { ordersTotal: 0, paid: 0 }
      return { ...prev, [dealerId]: { ...b, paid: b.paid + amount } }
    })
    await loadKotaAndPayments(dealerId)
    setSavingPayment(null)
  }

  async function updateOrderPaymentStatus(orderId: string, dealerId: string, status: string) {
    await supabase.from('orders').update({ payment_status: status }).eq('id', orderId)
    setDealerOrders(prev => ({
      ...prev,
      [dealerId]: (prev[dealerId] || []).map(o => o.id === orderId ? { ...o, payment_status: status } : o)
    }))
  }

  async function deletePayment(dealerId: string, paymentId: string, amount: number) {
    if (!confirm('Bu ödemeyi silmek istediğinizden emin misiniz?')) return
    await supabase.from('dealer_payments').delete().eq('id', paymentId)
    setDealerBalance(prev => {
      const b = prev[dealerId] || { ordersTotal: 0, paid: 0 }
      return { ...prev, [dealerId]: { ...b, paid: Math.max(0, b.paid - amount) } }
    })
    await loadKotaAndPayments(dealerId)
  }

  async function saveCategory() {
    if (!catForm.name.trim()) return
    setSavingCat(true)
    const rules: Record<string, any> = {}
    if (catForm.total_quota_enabled && catForm.total_quota_value && catForm.total_quota_unit)
      rules.total_quota = { value: parseFloat(catForm.total_quota_value), unit: catForm.total_quota_unit }
    if (catForm.product_quotas_enabled && pqRows.length > 0) {
      const valid = pqRows.filter(r => r.product_id && r.value)
      if (valid.length > 0) rules.product_quotas = valid.map(r => ({ product_id: r.product_id, product_name: r.product_name, unit: r.unit, value: parseFloat(r.value) }))
    }
    if (catForm.amount_quota_enabled && catForm.amount_quota) rules.amount_quota = parseFloat(catForm.amount_quota)
    await supabase.from('dealer_categories').insert({ tenant_id: tenantId, name: catForm.name.trim(), rules })
    setCatForm(emptyForm)
    setPqRows([])
    const { data } = await supabase.from('dealer_categories').select('*').eq('tenant_id', tenantId).order('name')
    setCategories(data || [])
    setSavingCat(false)
  }

  async function deleteCategory(id: string) {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return
    await supabase.from('dealers').update({ category_id: null }).eq('category_id', id)
    await supabase.from('dealer_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
    setDealers(prev => prev.map(d => d.category_id === id ? { ...d, category_id: null } : d))
  }

  function addPqRow() { setPqRows(prev => [...prev, { product_id: '', product_name: '', unit: '', value: '' }]) }
  function updatePqRow(idx: number, field: keyof ProductQuotaRow, val: string) {
    setPqRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      if (field === 'product_id') {
        const prod = products.find(p => p.id === val)
        return { ...r, product_id: val, product_name: prod?.name || '', unit: prod?.unit || '' }
      }
      return { ...r, [field]: val }
    }))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  const inputSm = { padding: '5px 8px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, fontSize: 13, outline: 'none' } as const

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link href={`/${slug}/dashboard`} style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← {tenantName}</Link>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginTop: 6 }}>Bayiler</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowCatPanel(!showCatPanel)}
              style={{ padding: '9px 18px', background: showCatPanel ? '#0f0f0f' : 'transparent', color: showCatPanel ? 'white' : '#374151', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500 }}>
              Kategoriler{categories.length > 0 ? ` (${categories.length})` : ''}
            </button>
            <Link href={`/${slug}/dealers/new`}
              style={{ padding: '9px 18px', background: '#0f0f0f', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              + Yeni Bayi
            </Link>
          </div>
        </div>

        {/* Kategori Paneli */}
        {showCatPanel && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, marginBottom: 16 }}>Bayi Kategorileri</h2>
            {categories.length > 0 && (
              <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {categories.map(c => {
                  const tq = c.rules?.total_quota || (c.rules?.product_quota ? { value: c.rules.product_quota, unit: c.rules.product_quota_unit || 'adet' } : null)
                  const pqs = c.rules?.product_quotas || []
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '10px 14px', background: '#f5f2ec', borderRadius: 8 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                        {tq && <span style={{ fontSize: 11, background: '#e8f0fb', color: '#2563a8', padding: '2px 8px', borderRadius: 10 }}>Toplam kota: maks. {tq.value} {tq.unit}/sipariş</span>}
                        {pqs.map((q, i) => <span key={i} style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 10 }}>{q.product_name}: maks. {q.value} {q.unit}/sipariş</span>)}
                        {c.rules?.amount_quota && <span style={{ fontSize: 11, background: '#fdf3e0', color: '#b87d1a', padding: '2px 8px', borderRadius: 10 }}>Tutar kotası: maks. ₺{Number(c.rules.amount_quota).toLocaleString('tr-TR')}/sipariş</span>}
                      </div>
                      <button onClick={() => deleteCategory(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, padding: '0 4px', lineHeight: 1, marginLeft: 12, flexShrink: 0 }}>×</button>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ borderTop: categories.length > 0 ? '1px solid rgba(15,15,15,0.08)' : 'none', paddingTop: categories.length > 0 ? 16 : 0 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Yeni Kategori Ekle</div>
              <div style={{ display: 'grid', gap: 14 }}>
                <input value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} placeholder="Kategori adı (örn: Konsinye, Standart, Anlaşmalı)" style={{ padding: '9px 12px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none' }} />
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginBottom: catForm.total_quota_enabled ? 8 : 0 }}>
                    <input type="checkbox" checked={catForm.total_quota_enabled} onChange={e => setCatForm({ ...catForm, total_quota_enabled: e.target.checked })} style={{ width: 15, height: 15, accentColor: '#2d7a57', cursor: 'pointer' }} />
                    <span style={{ fontSize: 13 }}>Toplam ürün kotası (tüm ürünlerde toplam miktar limiti)</span>
                  </label>
                  {catForm.total_quota_enabled && (
                    <div style={{ display: 'flex', gap: 8, marginLeft: 23 }}>
                      <input type="number" min={1} value={catForm.total_quota_value} onChange={e => setCatForm({ ...catForm, total_quota_value: e.target.value })} placeholder="maks. miktar" style={{ ...inputSm, width: 100 }} />
                      <select value={catForm.total_quota_unit} onChange={e => setCatForm({ ...catForm, total_quota_unit: e.target.value })} style={{ ...inputSm, minWidth: 80 }}>
                        <option value="">— birim —</option>
                        {distinctUnits.map(u => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginBottom: catForm.product_quotas_enabled ? 8 : 0 }}>
                    <input type="checkbox" checked={catForm.product_quotas_enabled} onChange={e => { setCatForm({ ...catForm, product_quotas_enabled: e.target.checked }); if (e.target.checked && pqRows.length === 0) addPqRow() }} style={{ width: 15, height: 15, accentColor: '#2d7a57', cursor: 'pointer' }} />
                    <span style={{ fontSize: 13 }}>Ürün bazlı kota (belirli ürünler için ayrı limitler)</span>
                  </label>
                  {catForm.product_quotas_enabled && (
                    <div style={{ marginLeft: 23, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {pqRows.map((row, idx) => (
                        <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <select value={row.product_id} onChange={e => updatePqRow(idx, 'product_id', e.target.value)} style={{ ...inputSm, flex: 1, minWidth: 0 }}>
                            <option value="">— Ürün seç —</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <input type="number" min={1} value={row.value} onChange={e => updatePqRow(idx, 'value', e.target.value)} placeholder="maks." style={{ ...inputSm, width: 72 }} />
                          <span style={{ fontSize: 12, color: '#555', minWidth: 36 }}>{row.unit || '—'}</span>
                          <button onClick={() => setPqRows(prev => prev.filter((_, i) => i !== idx))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, padding: '0 2px', lineHeight: 1 }}>×</button>
                        </div>
                      ))}
                      <button onClick={addPqRow} style={{ alignSelf: 'flex-start', fontSize: 12, color: '#2d7a57', background: 'none', border: '1px dashed #2d7a57', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', marginTop: 2 }}>+ Ürün ekle</button>
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none', marginBottom: catForm.amount_quota_enabled ? 8 : 0 }}>
                    <input type="checkbox" checked={catForm.amount_quota_enabled} onChange={e => setCatForm({ ...catForm, amount_quota_enabled: e.target.checked })} style={{ width: 15, height: 15, accentColor: '#2d7a57', cursor: 'pointer' }} />
                    <span style={{ fontSize: 13 }}>Tutar bazlı sipariş kotası</span>
                  </label>
                  {catForm.amount_quota_enabled && (
                    <div style={{ marginLeft: 23 }}><input type="number" min={1} value={catForm.amount_quota} onChange={e => setCatForm({ ...catForm, amount_quota: e.target.value })} placeholder="maks. ₺" style={{ ...inputSm, width: 120 }} /></div>
                  )}
                </div>
                <div>
                  <button onClick={saveCategory} disabled={savingCat || !catForm.name.trim()}
                    style={{ padding: '9px 20px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: (savingCat || !catForm.name.trim()) ? 'not-allowed' : 'pointer', opacity: (savingCat || !catForm.name.trim()) ? 0.5 : 1 }}>
                    {savingCat ? 'Kaydediliyor...' : 'Kategori Ekle'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bayi Tablosu */}
        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ec' }}>
                {['', 'Kod', 'Firma', 'Kategori', 'Bölge', 'Vade (gün)', 'Bakiye', 'Durum'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dealers.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Henüz bayi yok</td></tr>
              ) : dealers.map(d => {
                const tab = expandedTab[d.id] || 'branches'
                const prices = dealerPrices[d.id] || []
                const payments = dealerPayments[d.id]
                const kota = dealerKota[d.id]
                const pf = priceForm[d.id] || { product_id: '', price: '' }
                const payF = paymentForm[d.id] || { amount: '', note: '' }
                const bal = dealerBalance[d.id] || { ordersTotal: 0, paid: 0 }
                const borç = bal.ordersTotal - bal.paid
                const cat = categories.find(c => c.id === d.category_id)
                return (
                  <>
                    <tr key={d.id}
                      style={{ borderBottom: expandedId === d.id ? 'none' : '1px solid rgba(15,15,15,0.06)', background: expandedId === d.id ? '#fafaf8' : 'white', opacity: d.status !== 'ACTIVE' ? 0.55 : 1 }}>
                      <td style={{ padding: '12px 8px 12px 14px', width: 28, cursor: 'pointer' }} onClick={() => toggleExpand(d.id)}>
                        <span style={{ color: '#aaa', fontSize: 12, display: 'inline-block', transform: expandedId === d.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
                      </td>
                      <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#666', cursor: 'pointer' }} onClick={() => toggleExpand(d.id)}>{d.code}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 500, cursor: 'pointer' }} onClick={() => toggleExpand(d.id)}>
                        {d.name}
                        {d.status !== 'ACTIVE' && <span style={{ marginLeft: 8, fontSize: 10, color: '#dc2626', background: '#fef2f2', padding: '1px 6px', borderRadius: 8 }}>Erişim Kapalı</span>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <select value={d.category_id || ''} onChange={e => setCategory(d.id, e.target.value)} onClick={e => e.stopPropagation()}
                          style={{ padding: '4px 8px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, fontSize: 12, outline: 'none', background: 'white', cursor: 'pointer' }}>
                          <option value="">—</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 14px', color: '#666' }}>{d.region || '—'}</td>
                      <td style={{ padding: '8px 14px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number" min="0"
                            value={vadeForms[d.id] !== undefined ? vadeForms[d.id] : (d.payment_terms ?? 30)}
                            onChange={e => setVadeForms(prev => ({ ...prev, [d.id]: e.target.value }))}
                            onBlur={() => saveVade(d.id)}
                            style={{ width: 52, padding: '4px 6px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, fontSize: 12, outline: 'none', textAlign: 'center' }}
                          />
                          <span style={{ fontSize: 11, color: '#aaa' }}>gün</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {bal.ordersTotal > 0
                          ? <span style={{ fontWeight: 600, fontSize: 12, color: '#374151' }}>₺{bal.ordersTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</span>
                          : <span style={{ color: '#ccc', fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button onClick={() => toggleStatus(d)} title={d.status === 'ACTIVE' ? 'Pasife al' : 'Aktife al'}
                          style={{ fontSize: 11, padding: '4px 10px', borderRadius: 20, fontWeight: 500, border: 'none', cursor: 'pointer', background: d.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2', color: d.status === 'ACTIVE' ? '#16a34a' : '#dc2626' }}>
                          {d.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === d.id && (
                      <tr key={d.id + '-detail'} style={{ borderBottom: '1px solid rgba(15,15,15,0.06)' }}>
                        <td colSpan={8} style={{ padding: '0 16px 16px 44px', background: '#fafaf8' }}>
                          {/* Sekme bar */}
                          <div style={{ display: 'flex', borderBottom: '1px solid rgba(15,15,15,0.08)', marginBottom: 14 }}>
                            {(['branches', 'prices', 'kota'] as const).map(t => (
                              <button key={t} onClick={() => switchTab(d.id, t)}
                                style={{ padding: '8px 16px', fontSize: 12, fontWeight: 500, border: 'none', borderBottom: tab === t ? '2px solid #0f0f0f' : '2px solid transparent', background: 'none', cursor: 'pointer', color: tab === t ? '#0f0f0f' : '#888', marginBottom: -1 }}>
                                {t === 'branches' ? `Şubeler${(branches[d.id] || []).length > 0 ? ` (${branches[d.id].length})` : ''}` : t === 'prices' ? `Özel Fiyatlar${prices.length > 0 ? ` (${prices.length})` : ''}` : 'Kota & Ödeme'}
                              </button>
                            ))}
                          </div>

                          {/* Şubeler */}
                          {tab === 'branches' && (
                            loadingBranches === d.id ? <p style={{ fontSize: 13, color: '#aaa' }}>Yükleniyor...</p>
                            : (branches[d.id] || []).length === 0 ? <p style={{ fontSize: 13, color: '#aaa' }}>Bu bayiye ait şube bulunmuyor.</p>
                            : (
                              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                <thead><tr>{['Şube Adı', 'Adres', 'İletişim Kişisi', 'Telefon'].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#aaa', fontWeight: 500, borderBottom: '1px solid rgba(15,15,15,0.06)' }}>{h}</th>)}</tr></thead>
                                <tbody>{(branches[d.id] || []).map(b => (
                                  <tr key={b.id}>
                                    <td style={{ padding: '8px 10px', fontWeight: 500, color: '#333' }}>{b.name}</td>
                                    <td style={{ padding: '8px 10px', color: '#666' }}>{b.address || '—'}</td>
                                    <td style={{ padding: '8px 10px', color: '#666' }}>{b.contact_person || '—'}</td>
                                    <td style={{ padding: '8px 10px', color: '#666' }}>{b.phone || '—'}</td>
                                  </tr>
                                ))}</tbody>
                              </table>
                            )
                          )}

                          {/* Özel Fiyatlar */}
                          {tab === 'prices' && (
                            <div>
                              {prices.length > 0 && (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 14 }}>
                                  <thead><tr>{['Ürün', 'Standart Fiyat', 'Özel Fiyat', ''].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#aaa', fontWeight: 500, borderBottom: '1px solid rgba(15,15,15,0.06)' }}>{h}</th>)}</tr></thead>
                                  <tbody>{prices.map(pr => (
                                    <tr key={pr.id}>
                                      <td style={{ padding: '8px 10px', fontWeight: 500, color: '#333' }}>{pr.dealer_products?.name}</td>
                                      <td style={{ padding: '8px 10px', color: '#aaa', textDecoration: 'line-through' }}>₺{Number(pr.dealer_products?.base_price).toLocaleString('tr-TR')}</td>
                                      <td style={{ padding: '8px 10px', color: '#16a34a', fontWeight: 600 }}>₺{Number(pr.price).toLocaleString('tr-TR')}</td>
                                      <td style={{ padding: '8px 10px' }}><button onClick={() => deletePrice(d.id, pr.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 15 }}>×</button></td>
                                    </tr>
                                  ))}</tbody>
                                </table>
                              )}
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <select value={pf.product_id} onChange={e => setPriceForm(prev => ({ ...prev, [d.id]: { ...pf, product_id: e.target.value } }))} style={{ ...inputSm, flex: 1, minWidth: 0 }}>
                                  <option value="">— Ürün seç —</option>
                                  {products.filter(p => !prices.find(pr => pr.product_id === p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <input type="number" min={0} step="0.01" placeholder="Özel fiyat ₺" value={pf.price} onChange={e => setPriceForm(prev => ({ ...prev, [d.id]: { ...pf, price: e.target.value } }))} style={{ ...inputSm, width: 130 }} />
                                <button onClick={() => savePrice(d.id)} disabled={savingPrice === d.id || !pf.product_id || !pf.price}
                                  style={{ padding: '5px 14px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: (!pf.product_id || !pf.price) ? 'not-allowed' : 'pointer', opacity: (!pf.product_id || !pf.price) ? 0.4 : 1 }}>
                                  {savingPrice === d.id ? '...' : 'Ekle'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Kota & Ödeme */}
                          {tab === 'kota' && (
                            <div style={{ display: 'grid', gap: 16 }}>
                              {/* Sipariş tutarı özeti */}
                              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.08)', borderRadius: 8, padding: '10px 16px', minWidth: 140 }}>
                                  <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Toplam Sipariş Tutarı</div>
                                  <div style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>₺{bal.ordersTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div>
                                </div>
                              </div>

                              {/* Siparişler & Vade — sadece kotasız bayilerde */}
                              {(() => {
                                const hasKota = cat && (cat.rules?.total_quota || (cat.rules?.product_quotas?.length ?? 0) > 0 || cat.rules?.amount_quota)
                                if (hasKota) return null
                                const dOrders = dealerOrders[d.id] || []
                                if (dOrders.length === 0) return null
                                const vade = d.payment_terms ?? 30
                                const psColors: Record<string, { bg: string; color: string; label: string }> = {
                                  PAID:    { bg: '#f0fdf4', color: '#16a34a', label: 'Ödeme Alındı' },
                                  PARTIAL: { bg: '#fefce8', color: '#ca8a04', label: 'Kısmi Ödeme' },
                                  LATE:    { bg: '#fef2f2', color: '#dc2626', label: 'Ödeme Gecikti' },
                                  PENDING: { bg: '#fdf3e0', color: '#b87d1a', label: 'Bekliyor' },
                                }
                                return (
                                  <div>
                                    <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Siparişler & Vade</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                      <thead>
                                        <tr style={{ background: '#f5f5f5' }}>
                                          {['Sipariş No', 'Sipariş Tarihi', 'Vade Tarihi', 'Tutar', 'Ödeme Durumu'].map(h => (
                                            <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#888', fontWeight: 500, borderBottom: '1px solid rgba(15,15,15,0.08)' }}>{h}</th>
                                          ))}
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {dOrders.map((o: any) => {
                                          const orderDate = new Date(o.created_at)
                                          const vadeDate = new Date(orderDate)
                                          vadeDate.setDate(vadeDate.getDate() + vade)
                                          const isOverdue = vadeDate < new Date()
                                          // Kaydedilmiş payment_status yoksa hesapla
                                          const ps = o.payment_status || (isOverdue ? 'LATE' : 'PENDING')
                                          const psStyle = psColors[ps] || psColors['PENDING']
                                          return (
                                            <tr key={o.id} style={{ borderBottom: '1px solid rgba(15,15,15,0.05)' }}>
                                              <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#666' }}>{o.order_no || '—'}</td>
                                              <td style={{ padding: '7px 10px', color: '#666' }}>{orderDate.toLocaleDateString('tr-TR')}</td>
                                              <td style={{ padding: '7px 10px', fontWeight: 500, color: isOverdue && ps !== 'PAID' ? '#dc2626' : '#374151' }}>
                                                {vadeDate.toLocaleDateString('tr-TR')}
                                              </td>
                                              <td style={{ padding: '7px 10px', fontWeight: 600 }}>₺{Number(o.total).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                                              <td style={{ padding: '7px 10px' }}>
                                                <select
                                                  value={ps}
                                                  onChange={e => updateOrderPaymentStatus(o.id, d.id, e.target.value)}
                                                  style={{ padding: '3px 7px', borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: psStyle.bg, color: psStyle.color, outline: 'none' }}
                                                >
                                                  <option value="PAID">Ödeme Alındı</option>
                                                  <option value="PARTIAL">Kısmi Ödeme</option>
                                                  <option value="LATE">Ödeme Gecikti</option>
                                                  <option value="PENDING">Bekliyor</option>
                                                </select>
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )
                              })()}

                              {/* Kota kullanım */}
                              {cat && kota && (() => {
                                const tq = cat.rules?.total_quota || (cat.rules?.product_quota ? { value: cat.rules.product_quota, unit: cat.rules.product_quota_unit || 'adet' } : null)
                                const pqs = cat.rules?.product_quotas || []
                                const aq = cat.rules?.amount_quota
                                const rows: { label: string; used: number; limit: number; unit: string }[] = []
                                if (tq) rows.push({ label: 'Toplam Kota', used: kota.totalQty, limit: tq.value, unit: tq.unit })
                                pqs.forEach(q => {
                                  const usedForProduct = kota.byProduct[q.product_id] || 0
                                  rows.push({ label: q.product_name, used: usedForProduct, limit: q.value, unit: q.unit })
                                })
                                if (aq) rows.push({ label: 'Tutar Kotası', used: bal.ordersTotal, limit: aq, unit: '₺' })
                                return rows.length > 0 ? (
                                  <div>
                                    <div style={{ fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Kota Kullanımı ({cat.name})</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                      {rows.map(r => {
                                        const pct = Math.min(100, (r.used / r.limit) * 100)
                                        const over = r.used > r.limit
                                        return (
                                          <div key={r.label}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                              <span style={{ color: '#374151' }}>{r.label}</span>
                                              <span style={{ fontWeight: 500, color: over ? '#dc2626' : '#374151' }}>
                                                {r.unit === '₺' ? `₺${r.used.toLocaleString('tr-TR', { maximumFractionDigits: 0 })} / ₺${r.limit.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : `${r.used} / ${r.limit} ${r.unit}`}
                                              </span>
                                            </div>
                                            <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                                              <div style={{ height: '100%', width: `${pct}%`, background: over ? '#dc2626' : pct > 80 ? '#f59e0b' : '#2d7a57', borderRadius: 3, transition: 'width 0.3s' }} />
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                ) : null
                              })()}

                              {/* Ödeme ekle formu */}
                              <div>
                                <div style={{ fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Ödeme Al</div>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <input type="number" min={0} step="0.01" placeholder="Tutar ₺" value={payF.amount} onChange={e => setPaymentForm(prev => ({ ...prev, [d.id]: { ...payF, amount: e.target.value } }))} style={{ ...inputSm, width: 120 }} />
                                  <input type="text" placeholder="Not (opsiyonel)" value={payF.note} onChange={e => setPaymentForm(prev => ({ ...prev, [d.id]: { ...payF, note: e.target.value } }))} style={{ ...inputSm, flex: 1 }} />
                                  <button onClick={() => savePayment(d.id)} disabled={savingPayment === d.id || !payF.amount}
                                    style={{ padding: '5px 14px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: !payF.amount ? 'not-allowed' : 'pointer', opacity: !payF.amount ? 0.4 : 1 }}>
                                    {savingPayment === d.id ? '...' : 'Kaydet'}
                                  </button>
                                </div>
                              </div>

                              {/* Ödeme geçmişi */}
                              {payments === undefined ? (
                                <p style={{ fontSize: 13, color: '#aaa' }}>Yükleniyor...</p>
                              ) : payments.length > 0 ? (
                                <div>
                                  <div style={{ fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Ödeme Geçmişi</div>
                                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                                    <thead><tr>{['Tarih', 'Tutar', 'Not', ''].map(h => <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#aaa', fontWeight: 500, borderBottom: '1px solid rgba(15,15,15,0.06)' }}>{h}</th>)}</tr></thead>
                                    <tbody>{payments.map(p => (
                                      <tr key={p.id}>
                                        <td style={{ padding: '8px 10px', color: '#666' }}>{new Date(p.created_at).toLocaleDateString('tr-TR')}</td>
                                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#16a34a' }}>₺{Number(p.amount).toLocaleString('tr-TR')}</td>
                                        <td style={{ padding: '8px 10px', color: '#888' }}>{p.note || '—'}</td>
                                        <td style={{ padding: '8px 10px' }}><button onClick={() => deletePayment(d.id, p.id, p.amount)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 15 }}>×</button></td>
                                      </tr>
                                    ))}</tbody>
                                  </table>
                                </div>
                              ) : <p style={{ fontSize: 12, color: '#aaa' }}>Henüz ödeme kaydı yok.</p>}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
