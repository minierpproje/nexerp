'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function TenantDashboard() {
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()
  const router = useRouter()

  const [tenant, setTenant] = useState<any>(null)
  const [orders, setOrders] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [orderItems, setOrderItems] = useState<Record<string, any[]>>({})
  const [loadingItems, setLoadingItems] = useState<string | null>(null)
  const [updatingItemId, setUpdatingItemId] = useState('')

  const [filterDealer, setFilterDealer] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
    const isSuperAdmin = profile?.is_super_admin === true

    const { data: tenantData } = await supabase.from('tenants').select('*, stock_integrated').eq('slug', slug).single()
    if (!tenantData) { router.push('/'); return }
    if (!isSuperAdmin && tenantData.owner_id !== user.id) { router.push(`/${slug}/login`); return }
    const mods: string[] = tenantData.modules || []
    if (!mods.includes('dealer_orders')) { router.push(`/${slug}`); return }
    setTenant(tenantData)

    let { data: ordersData, error: ordErr } = await supabase
      .from('orders')
      .select('*, dealers(id, name), dealer_branches(name)')
      .eq('tenant_id', tenantData.id)
      .order('created_at', { ascending: false })
    if (ordErr) {
      const { data: fallback } = await supabase
        .from('orders').select('*, dealers(id, name)')
        .eq('tenant_id', tenantData.id).order('created_at', { ascending: false })
      ordersData = fallback
    }
    setOrders(ordersData || [])

    const { data: dealersData } = await supabase
      .from('dealers').select('id, name').eq('tenant_id', tenantData.id).order('name')
    setDealers(dealersData || [])

    setLoading(false)
  }

  async function toggleDetail(orderId: string) {
    if (expandedId === orderId) { setExpandedId(null); return }
    setExpandedId(orderId)
    if (!orderItems[orderId]) {
      setLoadingItems(orderId)
      const { data } = await supabase
        .from('order_items')
        .select('*, dealer_products(name, unit, code, category)')
        .eq('order_id', orderId)
      setOrderItems(prev => ({ ...prev, [orderId]: data || [] }))
      setLoadingItems(null)
    }
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdatingId(orderId)
    const prevOrder = orders.find(o => o.id === orderId)
    await supabase.from('orders').update({ status }).eq('id', orderId)

    if (status === 'CONFIRMED' && prevOrder?.status !== 'CONFIRMED' && tenant?.stock_integrated) {
      const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', orderId)
      if (items) for (const item of items) {
        const { data: prod } = await supabase.from('dealer_products').select('stock_quantity').eq('id', item.product_id).single()
        if (prod) await supabase.from('dealer_products').update({ stock_quantity: Math.max(0, (prod.stock_quantity || 0) - item.quantity) }).eq('id', item.product_id)
      }
    }
    if (status === 'CANCELLED' && prevOrder?.status === 'CONFIRMED' && tenant?.stock_integrated) {
      const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', orderId)
      if (items) for (const item of items) {
        const { data: prod } = await supabase.from('dealer_products').select('stock_quantity').eq('id', item.product_id).single()
        if (prod) await supabase.from('dealer_products').update({ stock_quantity: (prod.stock_quantity || 0) + item.quantity }).eq('id', item.product_id)
      }
    }

    setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
    setUpdatingId('')
  }

  async function updateItemStatus(itemId: string, orderId: string, status: string) {
    setUpdatingItemId(itemId)
    await supabase.from('order_items').update({ status }).eq('id', itemId)
    setOrderItems(prev => ({
      ...prev,
      [orderId]: (prev[orderId] || []).map(it => it.id === itemId ? { ...it, status } : it)
    }))
    setUpdatingItemId('')
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

  const filtered = orders.filter(o => {
    if (filterDealer && o.dealers?.id !== filterDealer) return false
    if (filterStatus && o.status !== filterStatus) return false
    if (filterFrom && new Date(o.created_at) < new Date(filterFrom)) return false
    if (filterTo && new Date(o.created_at) > new Date(filterTo + 'T23:59:59')) return false
    return true
  })

  const hasFilter = filterDealer || filterStatus || filterFrom || filterTo

  const inputSm: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid rgba(15,15,15,0.15)',
    borderRadius: 8, fontSize: 13, outline: 'none', background: 'white', color: '#111',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link href={`/${slug}?select=1`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(15,15,15,0.07)', borderRadius: 8, fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 500 }}>← Panel</Link>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginTop: 6 }}>{tenant?.name}</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href={`/${slug}/dealers`} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f' }}>Bayiler</Link>
            {(tenant?.modules || []).includes('dealer_orders') && <Link href={`/${slug}/products`} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f' }}>Ürünler</Link>}
            {(tenant?.modules || []).includes('stock') && <Link href={`/${slug}/stock`} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f' }}>Stok</Link>}
            {(tenant?.modules || []).includes('crm') && <Link href={`/${slug}/crm`} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f' }}>CRM</Link>}
            {(tenant?.modules || []).includes('gider') && <Link href={`/${slug}/gider`} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f' }}>Gider</Link>}
            {(tenant?.modules || []).includes('aktivite') && <Link href={`/${slug}/aktivite`} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f' }}>Aktivite</Link>}
            <Link href={`/${slug}/settings`} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f' }}>Ayarlar</Link>
          </div>
        </div>

        {/* Kartlar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Toplam Sipariş', value: orders.length, isMoney: false },
            { label: 'Bekleyen Onay', value: orders.filter(o => o.status === 'PENDING').length, isMoney: false },
            { label: 'Aktif Bayi', value: dealers.length, isMoney: false },
            { label: 'Toplam Sipariş Tutarı', value: orders.filter(o => o.status !== 'CANCELLED').reduce((s: number, o: any) => s + Number(o.total || 0), 0), isMoney: true },
          ].map(card => (
            <div key={card.label} style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1 }}>
                {card.isMoney ? `₺${Number(card.value).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` : card.value}
              </div>
            </div>
          ))}
        </div>

        {/* Filtreler */}
        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: '14px 18px', marginBottom: 12, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterDealer} onChange={e => setFilterDealer(e.target.value)} style={inputSm}>
            <option value="">Tüm Bayiler</option>
            {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={inputSm}>
            <option value="">Tüm Durumlar</option>
            {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={inputSm} />
            <span style={{ fontSize: 12, color: '#aaa' }}>—</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={inputSm} />
          </div>
          {hasFilter && (
            <button onClick={() => { setFilterDealer(''); setFilterStatus(''); setFilterFrom(''); setFilterTo('') }}
              style={{ padding: '7px 12px', background: 'none', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: '#888' }}>
              Temizle
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#aaa' }}>{filtered.length} sipariş</span>
        </div>

        {/* Tablo */}
        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ec' }}>
                {['', 'Sipariş No', 'Bayi', 'Tarih', 'Şube', 'Teslimat', 'Tutar', 'Not', 'Durum', 'İşlem'].map((h, i) => (
                  <th key={i} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Sipariş bulunamadı</td></tr>
              ) : filtered.map((o: any) => (
                <>
                  <tr key={o.id} style={{ borderBottom: expandedId === o.id ? 'none' : '1px solid rgba(15,15,15,0.06)', background: expandedId === o.id ? '#fafaf8' : 'white' }}>
                    <td style={{ padding: '12px 8px 12px 14px', width: 28 }}>
                      <button onClick={() => toggleDetail(o.id)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 13, padding: 0, display: 'inline-block', transform: expandedId === o.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                        ▶
                      </button>
                    </td>
                    <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{o.order_no}</td>
                    <td style={{ padding: '12px 14px', fontWeight: 500 }}>{o.dealers?.name || '—'}</td>
                    <td style={{ padding: '12px 14px', color: '#666', whiteSpace: 'nowrap' }}>{new Date(o.created_at).toLocaleDateString('tr-TR')}</td>
                    <td style={{ padding: '12px 14px' }}>
                      {o.dealer_branches?.name
                        ? <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>{o.dealer_branches.name}</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                      {o.delivery_date
                        ? <span style={{ background: '#fdf3e0', color: '#b87d1a', padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 500 }}>{new Date(o.delivery_date + 'T00:00:00').toLocaleDateString('tr-TR')}</span>
                        : <span style={{ color: '#ccc' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 500 }}>₺{Number(o.total).toLocaleString('tr-TR')}</td>
                    <td style={{ padding: '12px 14px', color: '#888', fontSize: 12, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.note || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 500, background: statusColor[o.status]?.bg, color: statusColor[o.status]?.color }}>
                        {statusLabel[o.status] || o.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <select value={o.status} disabled={updatingId === o.id} onChange={e => updateStatus(o.id, e.target.value)}
                        style={{ padding: '5px 8px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, fontSize: 12, outline: 'none', cursor: 'pointer', background: 'white', opacity: updatingId === o.id ? 0.5 : 1 }}>
                        {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                  </tr>
                  {expandedId === o.id && (
                    <tr key={o.id + '-detail'} style={{ borderBottom: '1px solid rgba(15,15,15,0.06)' }}>
                      <td colSpan={10} style={{ padding: '0 16px 16px 52px', background: '#fafaf8' }}>
                        {/* Şube + teslimat özeti */}
                        {(o.dealer_branches?.name || o.delivery_date) && (
                          <div style={{ display: 'flex', gap: 20, marginBottom: 10, paddingTop: 12, fontSize: 12, color: '#555' }}>
                            {o.dealer_branches?.name && (
                              <span>📍 <strong>Şube:</strong> {o.dealer_branches.name}</span>
                            )}
                            {o.delivery_date && (
                              <span>📅 <strong>Teslimat:</strong> {new Date(o.delivery_date + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                            )}
                            {o.note && (
                              <span>📝 <strong>Not:</strong> {o.note}</span>
                            )}
                          </div>
                        )}
                        {loadingItems === o.id ? (
                          <p style={{ fontSize: 13, color: '#aaa', padding: '12px 0' }}>Yükleniyor...</p>
                        ) : (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                            <thead>
                              <tr>
                                {['Kod', 'Ürün', 'Ürün Ağacı', 'Adet', 'Birim Fiyat', 'KDV', 'Toplam', 'Durum'].map(h => (
                                  <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#aaa', fontWeight: 500, borderBottom: '1px solid rgba(15,15,15,0.06)' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {(orderItems[o.id] || []).map((item: any) => (
                                <tr key={item.id}>
                                  <td style={{ padding: '7px 10px', fontFamily: 'monospace', color: '#999' }}>{item.dealer_products?.code || '—'}</td>
                                  <td style={{ padding: '7px 10px', fontWeight: 500, color: '#333' }}>{item.dealer_products?.name || '—'}</td>
                                  <td style={{ padding: '7px 10px', color: '#888', fontSize: 11 }}>{item.dealer_products?.category || '—'}</td>
                                  <td style={{ padding: '7px 10px', color: '#555' }}>{item.quantity} {item.dealer_products?.unit || ''}</td>
                                  <td style={{ padding: '7px 10px', color: '#555' }}>₺{Number(item.unit_price).toLocaleString('tr-TR')}</td>
                                  <td style={{ padding: '7px 10px', color: '#555' }}>%{item.vat_rate}</td>
                                  <td style={{ padding: '7px 10px', fontWeight: 500, color: '#333' }}>₺{(item.unit_price * item.quantity).toLocaleString('tr-TR')}</td>
                                  <td style={{ padding: '7px 10px' }}>
                                    <select value={item.status || 'PENDING'} disabled={updatingItemId === item.id}
                                      onChange={e => updateItemStatus(item.id, o.id, e.target.value)}
                                      style={{ padding: '4px 7px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, fontSize: 11, outline: 'none', cursor: 'pointer', background: 'white', opacity: updatingItemId === item.id ? 0.5 : 1 }}>
                                      {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                                    </select>
                                  </td>
                                </tr>
                              ))}
                              <tr>
                                <td colSpan={6} style={{ padding: '8px 10px', textAlign: 'right', fontSize: 12, color: '#888', borderTop: '1px solid rgba(15,15,15,0.06)' }}>KDV dahil toplam</td>
                                <td colSpan={2} style={{ padding: '8px 10px', fontWeight: 600, color: '#0f0f0f', borderTop: '1px solid rgba(15,15,15,0.06)' }}>₺{Number(o.total).toLocaleString('tr-TR')}</td>
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
