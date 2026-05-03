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
  const [branches, setBranches] = useState<any[]>([])
  const [levels, setLevels] = useState<any[]>([])
  const [levelValues, setLevelValues] = useState<Record<string, any[]>>({})
  const [selectedCats, setSelectedCats] = useState<Record<string, string>>({})

  const [tenantId, setTenantId] = useState('')
  const [dealerId, setDealerId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [lines, setLines] = useState<any[]>([])
  const [note, setNote] = useState('')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [isScheduled, setIsScheduled] = useState(false)
  const [deliveryDate, setDeliveryDate] = useState('')
  const [saving, setSaving] = useState(false)

  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({})
  const [loadingItems, setLoadingItems] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({})
  const [hideBasePrice, setHideBasePrice] = useState(false)
  const [dealerCategoryRules, setDealerCategoryRules] = useState<any>(null)
  const [kotaSummary, setKotaSummary] = useState<{ totalQty: number; byProduct: Record<string, number>; openAmount: number } | null>(null)
  const [totalPaid, setTotalPaid] = useState(0)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase
      .from('tenants').select('id, hide_base_price').eq('slug', slug).single()
    if (!tenantData) { router.push(`/${slug}/login`); return }
    setTenantId(tenantData.id)
    setHideBasePrice(tenantData.hide_base_price || false)

    const { data: dealerData } = await supabase
      .from('dealers').select('id, status')
      .eq('tenant_id', tenantData.id).eq('email', user.email).single()
    if (dealerData) {
      if (dealerData.status !== 'ACTIVE') { setBlocked(true); setLoading(false); return }
      setDealerId(dealerData.id)
      const [{ data: br }, { data: pricesData }, { data: dealerFull }, { data: paymentsData }, { data: activeOrders }] = await Promise.all([
        supabase.from('dealer_branches').select('*').eq('dealer_id', dealerData.id).order('name'),
        supabase.from('dealer_product_prices').select('product_id, price').eq('dealer_id', dealerData.id),
        supabase.from('dealers').select('dealer_categories(rules)').eq('id', dealerData.id).single(),
        supabase.from('dealer_payments').select('amount').eq('dealer_id', dealerData.id),
        supabase.from('orders').select('id, total').eq('dealer_id', dealerData.id).not('status', 'in', '("DELIVERED","CANCELLED")'),
      ])
      setBranches(br || [])
      if (pricesData) {
        const map: Record<string, number> = {}
        pricesData.forEach((p: any) => { map[p.product_id] = p.price })
        setCustomPrices(map)
      }
      const catRules = (dealerFull as any)?.dealer_categories?.rules || null
      setDealerCategoryRules(catRules)
      setTotalPaid((paymentsData || []).reduce((s: number, p: any) => s + Number(p.amount), 0))
      if (activeOrders && activeOrders.length > 0) {
        const openAmount = activeOrders.reduce((s: number, o: any) => s + Number(o.total), 0)
        const { data: items } = await supabase.from('order_items').select('product_id, quantity').in('order_id', activeOrders.map((o: any) => o.id))
        const byProduct: Record<string, number> = {}
        let totalQty = 0
        ;(items || []).forEach((item: any) => {
          byProduct[item.product_id] = (byProduct[item.product_id] || 0) + Number(item.quantity)
          totalQty += Number(item.quantity)
        })
        setKotaSummary({ totalQty, byProduct, openAmount })
      }
    }

    let { data: ordersData, error: ordErr } = await supabase
      .from('orders')
      .select('*, dealers(name), dealer_branches(name)')
      .eq('tenant_id', tenantData.id)
      .order('created_at', { ascending: false })
    if (ordErr) {
      const { data: fallback } = await supabase
        .from('orders').select('*, dealers(name)')
        .eq('tenant_id', tenantData.id).order('created_at', { ascending: false })
      ordersData = fallback
    }
    setOrders(ordersData || [])

    const { data: prodsData } = await supabase
      .from('dealer_products').select('*')
      .eq('tenant_id', tenantData.id).eq('status', 'ACTIVE')
    setProducts(prodsData || [])

    const { data: lvls } = await supabase
      .from('product_category_levels').select('id, name, sort_order')
      .eq('tenant_id', tenantData.id).order('sort_order')
    if (lvls && lvls.length > 0) {
      setLevels(lvls)
      const entries = await Promise.all(lvls.map(async l => {
        const { data } = await supabase
          .from('product_category_values').select('id, name')
          .eq('tenant_id', tenantData.id).eq('level_id', l.id).order('name')
        return [l.id, data || []] as [string, any[]]
      }))
      setLevelValues(Object.fromEntries(entries))
    }

    setLoading(false)
  }

  function selectCat(levelId: string, valueName: string, idx: number) {
    const next: Record<string, string> = {}
    levels.slice(0, idx).forEach(l => { next[l.id] = selectedCats[l.id] || '' })
    next[levelId] = valueName
    setSelectedCats(next)
  }

  function getFilteredProducts() {
    const hasFilter = levels.some(l => selectedCats[l.id])
    if (!hasFilter) return products
    return products.filter(p => {
      for (const l of levels) {
        const sel = selectedCats[l.id]
        if (!sel) continue
        if ((p.category_data?.[l.id] || '') !== sel) return false
      }
      return true
    })
  }

  function getCategoryPath(categoryData: any) {
    if (!categoryData || !levels.length) return ''
    return levels.map(l => categoryData[l.id]).filter(Boolean).join(' › ')
  }

  function addToCart(productId: string) {
    const existing = lines.find(l => l.product_id === productId)
    if (existing) {
      setLines(lines.map(l => l.product_id === productId ? { ...l, qty: l.qty + 1 } : l))
    } else {
      setLines([...lines, { product_id: productId, qty: 1 }])
    }
  }

  function updateQty(productId: string, qty: number) {
    if (qty < 1) return
    setLines(lines.map(l => l.product_id === productId ? { ...l, qty } : l))
  }

  function removeLine(productId: string) {
    setLines(lines.filter(l => l.product_id !== productId))
  }

  function getPrice(product: any): number {
    return customPrices[product.id] ?? product.base_price
  }

  function calcTotal() {
    return lines.reduce((sum, l) => {
      const p = products.find(x => x.id === l.product_id)
      if (!p) return sum
      return sum + getPrice(p) * l.qty * (1 + p.vat_rate / 100)
    }, 0)
  }

  async function toggleDetail(orderId: string) {
    if (expandedId === orderId) { setExpandedId(null); return }
    setExpandedId(orderId)
    if (!orderItems[orderId]) {
      setLoadingItems(orderId)
      const { data } = await supabase
        .from('order_items')
        .select('*, dealer_products(name, unit, code, category, category_data)')
        .eq('order_id', orderId)
      setOrderItems(prev => ({ ...prev, [orderId]: data || [] }))
      setLoadingItems(null)
    }
  }

  async function saveOrder() {
    if (!lines.length) return
    if (isScheduled && !deliveryDate) return
    setSaving(true)

    const count = orders.length + 1
    const orderNo = `ORD-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`
    let subtotal = 0, vatAmount = 0
    lines.forEach(l => {
      const p = products.find(x => x.id === l.product_id)
      if (p) { const pr = getPrice(p); subtotal += pr * l.qty; vatAmount += pr * l.qty * (p.vat_rate / 100) }
    })

    const { data: newOrder } = await supabase.from('orders').insert({
      tenant_id: tenantId,
      dealer_id: dealerId || undefined,
      branch_id: selectedBranch || undefined,
      order_no: orderNo,
      status: 'PENDING',
      note,
      subtotal,
      vat_amount: vatAmount,
      total: subtotal + vatAmount,
      delivery_date: isScheduled && deliveryDate ? deliveryDate : null,
    }).select().single()

    if (newOrder) {
      for (const l of lines) {
        const p = products.find(x => x.id === l.product_id)
        if (p) {
          const pr = getPrice(p)
          await supabase.from('order_items').insert({
            order_id: newOrder.id,
            product_id: l.product_id,
            quantity: l.qty,
            unit_price: pr,
            vat_rate: p.vat_rate,
            line_total: pr * l.qty,
          })
        }
      }
    }

    setLines([]); setNote(''); setSelectedBranch('')
    setIsScheduled(false); setDeliveryDate('')
    setSelectedCats({}); setShowForm(false); setSaving(false)
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

  if (blocked) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <div style={{ textAlign: 'center', background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: '48px 40px', maxWidth: 400 }}>
        <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
        <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, marginBottom: 10 }}>Hesabınız Askıya Alındı</h2>
        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 24 }}>Hesabınıza erişim geçici olarak kapatılmıştır. Daha fazla bilgi için yetkili ile iletişime geçin.</p>
        <button onClick={async () => { await supabase.auth.signOut(); window.location.href = '/' }}
          style={{ padding: '10px 24px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
          Çıkış Yap
        </button>
      </div>
    </div>
  )

  const today = new Date().toISOString().split('T')[0]
  const filteredProducts = getFilteredProducts()

  const openAmt = kotaSummary?.openAmount || 0
  const netBorç = openAmt - totalPaid
  const catTq = dealerCategoryRules?.total_quota || (dealerCategoryRules?.product_quota ? { value: dealerCategoryRules.product_quota, unit: dealerCategoryRules.product_quota_unit || 'adet' } : null)
  const catPqs: any[] = dealerCategoryRules?.product_quotas || []
  const catAq: number | null = dealerCategoryRules?.amount_quota || null
  const showSummary = !!(kotaSummary || totalPaid > 0)
  const kotaRows: { label: string; used: number; limit: number; unit: string }[] = []
  if (kotaSummary && catTq) kotaRows.push({ label: 'Toplam Kota', used: kotaSummary.totalQty, limit: catTq.value, unit: catTq.unit })
  if (kotaSummary) catPqs.forEach((q: any) => kotaRows.push({ label: q.product_name, used: kotaSummary.byProduct[q.product_id] || 0, limit: q.value, unit: q.unit }))
  if (kotaSummary && catAq) kotaRows.push({ label: 'Tutar Kotası', used: openAmt, limit: catAq, unit: '₺' })

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Özet Kart */}
        {showSummary && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: kotaRows.length > 0 ? 14 : 0 }}>
              <div><div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Açık Siparişler</div><div style={{ fontSize: 15, fontWeight: 600 }}>₺{openAmt.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div></div>
              <div><div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>Toplam Ödeme</div><div style={{ fontSize: 15, fontWeight: 600, color: '#16a34a' }}>₺{totalPaid.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div></div>
              <div><div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>{netBorç > 0 ? 'Net Borcunuz' : 'Net Alacağınız'}</div><div style={{ fontSize: 15, fontWeight: 600, color: netBorç > 0 ? '#dc2626' : '#16a34a' }}>₺{Math.abs(netBorç).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</div></div>
            </div>
            {kotaRows.length > 0 && (
              <div style={{ borderTop: '1px solid rgba(15,15,15,0.07)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {kotaRows.map(r => {
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
                      <div style={{ height: 5, background: '#f0f0f0', borderRadius: 3 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: over ? '#dc2626' : pct > 80 ? '#f59e0b' : '#2d7a57', borderRadius: 3 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2d7a57', marginBottom: 4 }}>{slug}</div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1 }}>Siparişlerim</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => router.push(`/${slug}/branches`)}
              style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              Şubelerim{branches.length > 0 && <span style={{ background: '#2d7a57', color: 'white', borderRadius: 10, fontSize: 11, padding: '1px 6px', marginLeft: 6 }}>{branches.length}</span>}
            </button>
            <button onClick={() => { setShowForm(!showForm); setLines([]); setSelectedCats({}) }}
              style={{ padding: '9px 18px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              {showForm ? 'İptal' : '+ Yeni Sipariş'}
            </button>
          </div>
        </div>

        {/* Sipariş Formu */}
        {showForm && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 20, marginBottom: 20 }}>Yeni Sipariş</h2>

            {/* Kategori filtreleri */}
            {levels.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Ürün Filtrele</div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {levels.map((level, idx) => {
                    const prevSelected = idx === 0 || !!selectedCats[levels[idx - 1].id]
                    if (!prevSelected) return null
                    const opts = levelValues[level.id] || []
                    return (
                      <select key={level.id} value={selectedCats[level.id] || ''}
                        onChange={e => selectCat(level.id, e.target.value, idx)}
                        style={{ padding: '8px 10px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', minWidth: 140 }}>
                        <option value="">— {level.name} —</option>
                        {opts.map((o: any) => <option key={o.id} value={o.name}>{o.name}</option>)}
                      </select>
                    )
                  })}
                  {levels.some(l => selectedCats[l.id]) && (
                    <button onClick={() => setSelectedCats({})}
                      style={{ padding: '8px 12px', background: 'none', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: '#888' }}>
                      Temizle
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Ürün listesi */}
            <div style={{ marginBottom: 16, maxHeight: 240, overflowY: 'auto', border: '1px solid rgba(15,15,15,0.08)', borderRadius: 8 }}>
              {filteredProducts.length === 0 ? (
                <div style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>Ürün bulunamadı</div>
              ) : (
                filteredProducts.map((p: any) => {
                  const inCart = lines.find(l => l.product_id === p.id)
                  const catPath = getCategoryPath(p.category_data) || p.category || ''
                  return (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(15,15,15,0.05)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                        {catPath && <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{catPath}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {customPrices[p.id] != null ? (
                          <span style={{ fontSize: 13 }}>
                            {!hideBasePrice && <span style={{ color: '#aaa', textDecoration: 'line-through', marginRight: 4 }}>₺{Number(p.base_price).toLocaleString('tr-TR')}</span>}
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>₺{Number(customPrices[p.id]).toLocaleString('tr-TR')}</span>
                            <span style={{ color: '#555' }}>/{p.unit}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 13, color: '#555' }}>₺{Number(p.base_price).toLocaleString('tr-TR')}/{p.unit}</span>
                        )}
                        <button onClick={() => addToCart(p.id)}
                          style={{ padding: '5px 14px', background: inCart ? '#f0fdf4' : '#0f0f0f', color: inCart ? '#16a34a' : 'white', border: inCart ? '1px solid #bbf7d0' : 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {inCart ? `Sepette (${inCart.qty})` : 'Sepete Ekle'}
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Sepet */}
            {lines.length > 0 && (
              <div style={{ border: '1px solid rgba(15,15,15,0.1)', borderRadius: 8, marginBottom: 16, overflow: 'hidden' }}>
                <div style={{ background: '#f5f2ec', padding: '8px 14px', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sepet</div>
                {lines.map(l => {
                  const p = products.find(x => x.id === l.product_id)
                  if (!p) return null
                  const catPath = getCategoryPath(p.category_data) || p.category || ''
                  const lineTotal = getPrice(p) * l.qty * (1 + p.vat_rate / 100)
                  return (
                    <div key={l.product_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', borderBottom: '1px solid rgba(15,15,15,0.05)' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500 }}>{p.name}</div>
                        {catPath && <div style={{ fontSize: 11, color: '#aaa' }}>{catPath}</div>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => updateQty(l.product_id, l.qty - 1)} disabled={l.qty <= 1}
                          style={{ width: 26, height: 26, border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, background: 'white', cursor: l.qty <= 1 ? 'not-allowed' : 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: l.qty <= 1 ? 0.4 : 1 }}>−</button>
                        <input
                          type="number" min={1} value={l.qty}
                          onChange={e => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) updateQty(l.product_id, v) }}
                          style={{ width: 44, height: 26, border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, textAlign: 'center', fontSize: 13, fontWeight: 500, outline: 'none', padding: 0 }} />
                        <button onClick={() => updateQty(l.product_id, l.qty + 1)}
                          style={{ width: 26, height: 26, border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                      </div>
                      <span style={{ fontSize: 13, color: '#555', minWidth: 80, textAlign: 'right' }}>₺{lineTotal.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</span>
                      <button onClick={() => removeLine(l.product_id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, padding: '0 2px' }}>×</button>
                    </div>
                  )
                })}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', fontSize: 14, fontWeight: 500, background: '#fafaf8' }}>
                  <span style={{ color: '#888' }}>Toplam (KDV dahil)</span>
                  <span>₺{calcTotal().toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}

            {/* Teslimat */}
            <div style={{ borderTop: '1px solid rgba(15,15,15,0.08)', paddingTop: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>Teslimat</div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 13, color: '#374151', marginBottom: 6 }}>Teslimat Şubesi</label>
                {branches.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, color: '#888' }}>Henüz şube eklenmemiş.</span>
                    <button onClick={() => router.push(`/${slug}/branches`)}
                      style={{ fontSize: 13, color: '#2d7a57', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                      Şube ekle →
                    </button>
                  </div>
                ) : (
                  <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
                    style={{ width: '100%', padding: '9px 10px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                    <option value="">— Seçim yapılmadı —</option>
                    {branches.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}{b.address ? ` — ${b.address}` : ''}</option>
                    ))}
                  </select>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isScheduled ? 10 : 0 }}>
                <input type="checkbox" id="scheduled" checked={isScheduled}
                  onChange={e => { setIsScheduled(e.target.checked); if (!e.target.checked) setDeliveryDate('') }}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#2d7a57' }} />
                <label htmlFor="scheduled" style={{ fontSize: 13, color: '#374151', cursor: 'pointer', userSelect: 'none' }}>Randevulu Teslimat</label>
              </div>
              {isScheduled && (
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <label style={{ fontSize: 13, color: '#374151', minWidth: 100 }}>Teslimat Tarihi</label>
                  <input type="date" value={deliveryDate} min={today} onChange={e => setDeliveryDate(e.target.value)}
                    style={{ padding: '8px 12px', border: `1px solid ${!deliveryDate ? '#dc2626' : 'rgba(15,15,15,0.15)'}`, borderRadius: 8, fontSize: 13, outline: 'none' }} />
                  {!deliveryDate && <span style={{ fontSize: 12, color: '#dc2626' }}>Tarih seçiniz</span>}
                </div>
              )}
            </div>

            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Sipariş notu (opsiyonel)"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />

            <button onClick={saveOrder} disabled={saving || !lines.length || (isScheduled && !deliveryDate)}
              style={{ padding: '10px 24px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: (saving || !lines.length || (isScheduled && !deliveryDate)) ? 'not-allowed' : 'pointer', opacity: (saving || !lines.length || (isScheduled && !deliveryDate)) ? 0.5 : 1 }}>
              {saving ? 'Kaydediliyor...' : 'Siparişi Gönder'}
            </button>
          </div>
        )}

        {/* Sipariş Listesi */}
        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ec' }}>
                {['', 'Sipariş No', 'Tarih', 'Şube', 'Teslimat', 'Tutar', 'Not', 'Durum'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Henüz sipariş yok</td></tr>
              ) : orders.map((o: any) => (
                <>
                  <tr key={o.id} style={{ borderBottom: expandedId === o.id ? 'none' : '1px solid rgba(15,15,15,0.06)', background: expandedId === o.id ? '#fafaf8' : 'white', cursor: 'pointer' }}
                    onClick={() => toggleDetail(o.id)}>
                    <td style={{ padding: '12px 8px 12px 14px', width: 28 }}>
                      <span style={{ color: '#aaa', fontSize: 13, display: 'inline-block', transform: expandedId === o.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{o.order_no}</td>
                    <td style={{ padding: '12px 14px', color: '#666', whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString('tr-TR')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {(() => { const b = branches.find(x => x.id === o.branch_id) || o.dealer_branches; return b?.name ? <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>{b.name}</span> : <span style={{ color: '#ccc' }}>—</span> })()}
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {o.delivery_date
                        ? <span style={{ background: '#fdf3e0', color: '#b87d1a', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>{new Date(o.delivery_date + 'T00:00:00').toLocaleDateString('tr-TR')}</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 500 }}>₺{Number(o.total).toLocaleString('tr-TR')}</td>
                    <td style={{ padding: '12px 14px', color: '#888', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.note || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 500, background: statusColor[o.status]?.bg, color: statusColor[o.status]?.color, whiteSpace: 'nowrap' }}>
                        {statusLabel[o.status] || o.status}
                      </span>
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr key={o.id + '-detail'} style={{ borderBottom: '1px solid rgba(15,15,15,0.06)' }}>
                      <td colSpan={8} style={{ padding: '0 16px 16px 44px', background: '#fafaf8' }}>
                        {loadingItems === o.id ? (
                          <p style={{ fontSize: 13, color: '#aaa', padding: '12px 0' }}>Yükleniyor...</p>
                        ) : (orderItems[o.id] || []).length === 0 ? (
                          <p style={{ fontSize: 13, color: '#aaa', padding: '12px 0' }}>Kalem bulunamadı</p>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr>
                                {['Ürün', 'Kategori', 'Adet', 'Birim Fiyat', 'Durum'].map(h => (
                                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#aaa', fontWeight: 500, borderBottom: '1px solid rgba(15,15,15,0.06)' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(orderItems[o.id] || []).map((item: any) => {
                                const catPath = getCategoryPath(item.dealer_products?.category_data) || item.dealer_products?.category || '—'
                                const sc = statusColor[item.status || 'PENDING']
                                return (
                                  <tr key={item.id}>
                                    <td style={{ padding: '8px 10px', fontWeight: 500, color: '#333' }}>{item.dealer_products?.name || '—'}</td>
                                    <td style={{ padding: '8px 10px', color: '#888', fontSize: 11 }}>{catPath}</td>
                                    <td style={{ padding: '8px 10px', color: '#555' }}>{item.quantity} {item.dealer_products?.unit || ''}</td>
                                    <td style={{ padding: '8px 10px', color: '#555' }}>₺{Number(item.unit_price).toLocaleString('tr-TR')}</td>
                                    <td style={{ padding: '8px 10px' }}>
                                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500, background: sc?.bg, color: sc?.color }}>
                                        {statusLabel[item.status || 'PENDING'] || item.status || 'Onay Bekliyor'}
                                      </span>
                                    </td>
                                  </tr>
                                )
                              })}
                              <tr>
                                <td colSpan={4} style={{ padding: '8px 10px', textAlign: 'right', color: '#888', borderTop: '1px solid rgba(15,15,15,0.06)', fontSize: 12 }}>Toplam (KDV dahil)</td>
                                <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0f0f0f', borderTop: '1px solid rgba(15,15,15,0.06)' }}>₺{Number(o.total).toLocaleString('tr-TR')}</td>
                              </tr>
                            </tbody>
                          </table>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
