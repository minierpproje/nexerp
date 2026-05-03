'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type ViewType = 'bayi' | 'bayi-kategori' | 'urun' | 'urun-agac' | 'bayi-urun' | 'donemsel'

const VIEWS: { key: ViewType; label: string }[] = [
  { key: 'bayi',         label: 'Bayi Bazlı' },
  { key: 'bayi-kategori',label: 'Bayi Kategorisi' },
  { key: 'urun',         label: 'Ürün Bazlı' },
  { key: 'urun-agac',   label: 'Ürün Ağacı' },
  { key: 'bayi-urun',   label: 'Bayi × Ürün' },
  { key: 'donemsel',     label: 'Dönemsel' },
]

export default function ReportsPage() {
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [tenantName, setTenantName] = useState('')
  const [orders, setOrders] = useState<any[]>([])
  const [orderItems, setOrderItems] = useState<any[]>([])
  const [dealers, setDealers] = useState<any[]>([])
  const [dealerCategories, setDealerCategories] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [levels, setLevels] = useState<any[]>([])
  const [view, setView] = useState<ViewType>('bayi')
  const [selectedLevel, setSelectedLevel] = useState('')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase.from('tenants').select('id, name').eq('slug', slug).single()
    if (!tenantData) { router.push('/'); return }
    setTenantName(tenantData.name)

    const [
      { data: ordersData },
      { data: dealersData },
      { data: paymentsData },
      { data: catsData },
      { data: levelsData },
    ] = await Promise.all([
      supabase.from('orders').select('id, dealer_id, status, total, created_at').eq('tenant_id', tenantData.id),
      supabase.from('dealers').select('id, name, category_id').eq('tenant_id', tenantData.id).order('name'),
      supabase.from('dealer_payments').select('dealer_id, amount').eq('tenant_id', tenantData.id),
      supabase.from('dealer_categories').select('id, name').eq('tenant_id', tenantData.id).order('name'),
      supabase.from('product_category_levels').select('id, name, sort_order').eq('tenant_id', tenantData.id).order('sort_order'),
    ])

    setOrders(ordersData || [])
    setDealers(dealersData || [])
    setPayments(paymentsData || [])
    setDealerCategories(catsData || [])
    const lvls = levelsData || []
    setLevels(lvls)
    if (lvls.length > 0) setSelectedLevel(lvls[0].id)

    const orderIds = (ordersData || []).map((o: any) => o.id)
    if (orderIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('order_id, product_id, quantity, unit_price, vat_rate, dealer_products(name, unit, category_data)')
        .in('order_id', orderIds)
      setOrderItems(itemsData || [])
    }

    setLoading(false)
  }

  const orderMap = Object.fromEntries(orders.map(o => [o.id, o]))

  function filterOrders(os: any[]) {
    return os.filter(o => {
      if (o.status === 'CANCELLED') return false
      if (filterFrom && new Date(o.created_at) < new Date(filterFrom)) return false
      if (filterTo && new Date(o.created_at) > new Date(filterTo + 'T23:59:59')) return false
      return true
    })
  }

  function filteredItems() {
    const ids = new Set(filterOrders(orders).map((o: any) => o.id))
    return orderItems.filter(i => ids.has(i.order_id))
  }

  function lineTotal(i: any) {
    return Number(i.unit_price) * Number(i.quantity) * (1 + (Number(i.vat_rate) || 0) / 100)
  }

  function downloadCSV(rows: string[][], filename: string) {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function fmt(n: number) { return '₺' + n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) }
  function fmtQty(n: number) { return n.toLocaleString('tr-TR') }

  // --- Bayi Bazlı ---
  function getBayiRows() {
    const fOrders = filterOrders(orders)
    const map: Record<string, { name: string; count: number; total: number; paid: number }> = {}
    fOrders.forEach((o: any) => {
      const d = dealers.find((x: any) => x.id === o.dealer_id)
      const name = d?.name || 'Bilinmeyen'
      if (!map[o.dealer_id]) map[o.dealer_id] = { name, count: 0, total: 0, paid: 0 }
      map[o.dealer_id].count += 1
      map[o.dealer_id].total += Number(o.total)
    })
    payments.forEach((p: any) => { if (map[p.dealer_id]) map[p.dealer_id].paid += Number(p.amount) })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  // --- Bayi Kategori Bazlı ---
  function getBayiKategoriRows() {
    const fOrders = filterOrders(orders)
    const map: Record<string, { name: string; count: number; total: number; paid: number }> = {}
    fOrders.forEach((o: any) => {
      const d = dealers.find((x: any) => x.id === o.dealer_id)
      const catId = d?.category_id || '__none__'
      const cat = dealerCategories.find((c: any) => c.id === catId)
      const name = cat?.name || 'Kategorisiz'
      if (!map[catId]) map[catId] = { name, count: 0, total: 0, paid: 0 }
      map[catId].count += 1
      map[catId].total += Number(o.total)
    })
    dealers.forEach((d: any) => {
      const catId = d.category_id || '__none__'
      if (!map[catId]) return
      const dPaid = payments.filter((p: any) => p.dealer_id === d.id).reduce((s: number, p: any) => s + Number(p.amount), 0)
      map[catId].paid += dPaid
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  // --- Ürün Bazlı ---
  function getUrunRows() {
    const map: Record<string, { name: string; unit: string; qty: number; total: number }> = {}
    filteredItems().forEach((i: any) => {
      const name = i.dealer_products?.name || 'Bilinmeyen'
      const unit = i.dealer_products?.unit || ''
      if (!map[i.product_id]) map[i.product_id] = { name, unit, qty: 0, total: 0 }
      map[i.product_id].qty += Number(i.quantity)
      map[i.product_id].total += lineTotal(i)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  // --- Ürün Ağacı Bazlı ---
  function getUrunAgacRows() {
    if (!selectedLevel) return []
    const map: Record<string, { name: string; productIds: Set<string>; qty: number; total: number }> = {}
    filteredItems().forEach((i: any) => {
      const catData = i.dealer_products?.category_data || {}
      const value = catData[selectedLevel] || 'Belirtilmemiş'
      if (!map[value]) map[value] = { name: value, productIds: new Set(), qty: 0, total: 0 }
      map[value].productIds.add(i.product_id)
      map[value].qty += Number(i.quantity)
      map[value].total += lineTotal(i)
    })
    return Object.values(map)
      .sort((a, b) => b.total - a.total)
      .map(r => ({ name: r.name, productCount: r.productIds.size, qty: r.qty, total: r.total }))
  }

  // --- Bayi × Ürün (dealer grouped) ---
  type BayiUrunGroup = { dealerId: string; dealerName: string; products: { name: string; unit: string; qty: number; total: number }[]; dealerTotal: number; dealerQty: number }
  function getBayiUrunGroups(): BayiUrunGroup[] {
    const items = filteredItems()
    const dealerMap: Record<string, Record<string, { name: string; unit: string; qty: number; total: number }>> = {}
    items.forEach((i: any) => {
      const order = orderMap[i.order_id]
      if (!order) return
      const dealerId = order.dealer_id
      const dealer = dealers.find((d: any) => d.id === dealerId)
      const productName = i.dealer_products?.name || 'Bilinmeyen'
      const unit = i.dealer_products?.unit || ''
      if (!dealerMap[dealerId]) dealerMap[dealerId] = {}
      if (!dealerMap[dealerId][i.product_id]) dealerMap[dealerId][i.product_id] = { name: productName, unit, qty: 0, total: 0 }
      dealerMap[dealerId][i.product_id].qty += Number(i.quantity)
      dealerMap[dealerId][i.product_id].total += lineTotal(i)
    })
    return Object.entries(dealerMap)
      .map(([dealerId, prodMap]) => {
        const dealer = dealers.find((d: any) => d.id === dealerId)
        const products = Object.values(prodMap).sort((a, b) => b.total - a.total)
        return {
          dealerId,
          dealerName: dealer?.name || 'Bilinmeyen',
          products,
          dealerTotal: products.reduce((s, p) => s + p.total, 0),
          dealerQty: products.reduce((s, p) => s + p.qty, 0),
        }
      })
      .sort((a, b) => b.dealerTotal - a.dealerTotal)
  }

  // --- Dönemsel ---
  function getDonemselRows() {
    const map: Record<string, { count: number; total: number }> = {}
    filterOrders(orders).forEach((o: any) => {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { count: 0, total: 0 }
      map[key].count += 1
      map[key].total += Number(o.total)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(([key, v]) => {
      const [y, m] = key.split('-')
      return { month: new Date(Number(y), Number(m) - 1).toLocaleString('tr-TR', { month: 'long', year: 'numeric' }), ...v }
    })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  const inputSm: React.CSSProperties = { padding: '7px 10px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white', color: '#111' }
  const thS: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)', whiteSpace: 'nowrap' }
  const tdS: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid rgba(15,15,15,0.05)' }
  const totalRowS: React.CSSProperties = { background: '#f5f2ec', fontWeight: 700 }

  const bayiRows = view === 'bayi' ? getBayiRows() : []
  const bayiKatRows = view === 'bayi-kategori' ? getBayiKategoriRows() : []
  const urunRows = view === 'urun' ? getUrunRows() : []
  const agacRows = view === 'urun-agac' ? getUrunAgacRows() : []
  const bayiUrunGroups = view === 'bayi-urun' ? getBayiUrunGroups() : []
  const donemRows = view === 'donemsel' ? getDonemselRows() : []

  function csvBtn(onClick: () => void) {
    return (
      <button onClick={onClick} style={{ padding: '6px 14px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
        CSV İndir
      </button>
    )
  }

  const selectedLevelName = levels.find(l => l.id === selectedLevel)?.name || ''

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <Link href={`/${slug}/dashboard`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(15,15,15,0.07)', borderRadius: 8, fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 500 }}>← {tenantName}</Link>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginTop: 6 }}>Raporlar</h1>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
            <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} style={inputSm} />
            <span style={{ fontSize: 12, color: '#aaa' }}>—</span>
            <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)} style={inputSm} />
            {(filterFrom || filterTo) && (
              <button onClick={() => { setFilterFrom(''); setFilterTo('') }}
                style={{ padding: '7px 12px', background: 'none', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: '#888' }}>
                Temizle
              </button>
            )}
          </div>
        </div>

        {/* View tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(15,15,15,0.1)', marginBottom: 20, gap: 0, flexWrap: 'wrap' }}>
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              style={{ padding: '10px 18px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: view === v.key ? '2px solid #0f0f0f' : '2px solid transparent', background: 'none', cursor: 'pointer', color: view === v.key ? '#0f0f0f' : '#888', marginBottom: -1, whiteSpace: 'nowrap' }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* ── Bayi Bazlı ── */}
        {view === 'bayi' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Bayi Bazlı Özet</span>
              {csvBtn(() => downloadCSV(
                [['Bayi', 'Sipariş Sayısı', 'Toplam Tutar (₺)', 'Ödenen (₺)', 'Kalan (₺)'],
                 ...bayiRows.map(r => [r.name, String(r.count), r.total.toFixed(2), r.paid.toFixed(2), Math.max(0, r.total - r.paid).toFixed(2)])],
                'bayi-raporu.csv'
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f5f2ec' }}>
                {['Bayi', 'Sipariş Sayısı', 'Toplam Tutar', 'Ödenen', 'Kalan'].map(h => <th key={h} style={thS}>{h}</th>)}
              </tr></thead>
              <tbody>
                {bayiRows.length === 0
                  ? <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                  : bayiRows.map((r, i) => {
                    const kalan = Math.max(0, r.total - r.paid)
                    return <tr key={i}>
                      <td style={{ ...tdS, fontWeight: 500 }}>{r.name}</td>
                      <td style={{ ...tdS, color: '#555' }}>{r.count}</td>
                      <td style={{ ...tdS, fontWeight: 600 }}>{fmt(r.total)}</td>
                      <td style={{ ...tdS, color: '#16a34a', fontWeight: 500 }}>{fmt(r.paid)}</td>
                      <td style={{ ...tdS, color: kalan > 0 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>{fmt(kalan)}</td>
                    </tr>
                  })}
                {bayiRows.length > 0 && <tr style={totalRowS}>
                  <td style={{ padding: '10px 14px' }}>Toplam</td>
                  <td style={{ padding: '10px 14px' }}>{bayiRows.reduce((s, r) => s + r.count, 0)}</td>
                  <td style={{ padding: '10px 14px' }}>{fmt(bayiRows.reduce((s, r) => s + r.total, 0))}</td>
                  <td style={{ padding: '10px 14px', color: '#16a34a' }}>{fmt(bayiRows.reduce((s, r) => s + r.paid, 0))}</td>
                  <td style={{ padding: '10px 14px', color: '#dc2626' }}>{fmt(bayiRows.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0))}</td>
                </tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Bayi Kategorisi Bazlı ── */}
        {view === 'bayi-kategori' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Bayi Kategorisi Bazlı</span>
              {csvBtn(() => downloadCSV(
                [['Kategori', 'Sipariş Sayısı', 'Toplam Tutar (₺)', 'Ödenen (₺)', 'Kalan (₺)'],
                 ...bayiKatRows.map(r => [r.name, String(r.count), r.total.toFixed(2), r.paid.toFixed(2), Math.max(0, r.total - r.paid).toFixed(2)])],
                'bayi-kategori-raporu.csv'
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f5f2ec' }}>
                {['Kategori', 'Sipariş Sayısı', 'Toplam Tutar', 'Ödenen', 'Kalan'].map(h => <th key={h} style={thS}>{h}</th>)}
              </tr></thead>
              <tbody>
                {bayiKatRows.length === 0
                  ? <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                  : bayiKatRows.map((r, i) => {
                    const kalan = Math.max(0, r.total - r.paid)
                    return <tr key={i}>
                      <td style={{ ...tdS, fontWeight: 500 }}>{r.name}</td>
                      <td style={{ ...tdS, color: '#555' }}>{r.count}</td>
                      <td style={{ ...tdS, fontWeight: 600 }}>{fmt(r.total)}</td>
                      <td style={{ ...tdS, color: '#16a34a', fontWeight: 500 }}>{fmt(r.paid)}</td>
                      <td style={{ ...tdS, color: kalan > 0 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>{fmt(kalan)}</td>
                    </tr>
                  })}
                {bayiKatRows.length > 0 && <tr style={totalRowS}>
                  <td style={{ padding: '10px 14px' }}>Toplam</td>
                  <td style={{ padding: '10px 14px' }}>{bayiKatRows.reduce((s, r) => s + r.count, 0)}</td>
                  <td style={{ padding: '10px 14px' }}>{fmt(bayiKatRows.reduce((s, r) => s + r.total, 0))}</td>
                  <td style={{ padding: '10px 14px', color: '#16a34a' }}>{fmt(bayiKatRows.reduce((s, r) => s + r.paid, 0))}</td>
                  <td style={{ padding: '10px 14px', color: '#dc2626' }}>{fmt(bayiKatRows.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0))}</td>
                </tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Ürün Bazlı ── */}
        {view === 'urun' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Ürün Bazlı Özet</span>
              {csvBtn(() => downloadCSV(
                [['Ürün', 'Birim', 'Toplam Adet', 'Toplam Tutar (₺ KDV dahil)'],
                 ...urunRows.map(r => [r.name, r.unit, String(r.qty), r.total.toFixed(2)])],
                'urun-raporu.csv'
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f5f2ec' }}>
                {['Ürün', 'Birim', 'Toplam Adet', 'Toplam Tutar (KDV dahil)'].map(h => <th key={h} style={thS}>{h}</th>)}
              </tr></thead>
              <tbody>
                {urunRows.length === 0
                  ? <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                  : urunRows.map((r, i) => <tr key={i}>
                      <td style={{ ...tdS, fontWeight: 500 }}>{r.name}</td>
                      <td style={{ ...tdS, color: '#555' }}>{r.unit}</td>
                      <td style={{ ...tdS, color: '#555' }}>{fmtQty(r.qty)}</td>
                      <td style={{ ...tdS, fontWeight: 600 }}>{fmt(r.total)}</td>
                    </tr>)
                }
                {urunRows.length > 0 && <tr style={totalRowS}>
                  <td style={{ padding: '10px 14px' }} colSpan={2}>Toplam</td>
                  <td style={{ padding: '10px 14px' }}>{fmtQty(urunRows.reduce((s, r) => s + r.qty, 0))}</td>
                  <td style={{ padding: '10px 14px' }}>{fmt(urunRows.reduce((s, r) => s + r.total, 0))}</td>
                </tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Ürün Ağacı Bazlı ── */}
        {view === 'urun-agac' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Ürün Ağacı Bazlı</span>
                {levels.length > 1 && (
                  <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} style={{ ...inputSm, padding: '5px 10px' }}>
                    {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                )}
              </div>
              {csvBtn(() => downloadCSV(
                [[selectedLevelName, '# Ürün', 'Toplam Adet', 'Toplam Tutar (₺ KDV dahil)'],
                 ...agacRows.map(r => [r.name, String(r.productCount), String(r.qty), r.total.toFixed(2)])],
                'urun-agac-raporu.csv'
              ))}
            </div>
            {levels.length === 0
              ? <p style={{ padding: 40, textAlign: 'center', color: '#888', margin: 0 }}>Ürün ağacı tanımlanmamış</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f5f2ec' }}>
                    {[selectedLevelName, '# Ürün', 'Toplam Adet', 'Toplam Tutar (KDV dahil)'].map(h => <th key={h} style={thS}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {agacRows.length === 0
                      ? <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                      : agacRows.map((r, i) => <tr key={i}>
                          <td style={{ ...tdS, fontWeight: 500 }}>{r.name}</td>
                          <td style={{ ...tdS, color: '#555' }}>{r.productCount}</td>
                          <td style={{ ...tdS, color: '#555' }}>{fmtQty(r.qty)}</td>
                          <td style={{ ...tdS, fontWeight: 600 }}>{fmt(r.total)}</td>
                        </tr>)
                    }
                    {agacRows.length > 0 && <tr style={totalRowS}>
                      <td style={{ padding: '10px 14px' }} colSpan={2}>Toplam</td>
                      <td style={{ padding: '10px 14px' }}>{fmtQty(agacRows.reduce((s, r) => s + r.qty, 0))}</td>
                      <td style={{ padding: '10px 14px' }}>{fmt(agacRows.reduce((s, r) => s + r.total, 0))}</td>
                    </tr>}
                  </tbody>
                </table>
            }
          </div>
        )}

        {/* ── Bayi × Ürün ── */}
        {view === 'bayi-urun' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Bayi × Ürün</span>
              {csvBtn(() => {
                const rows: string[][] = [['Bayi', 'Ürün', 'Birim', 'Toplam Adet', 'Toplam Tutar (₺ KDV dahil)']]
                bayiUrunGroups.forEach(g => g.products.forEach(p => rows.push([g.dealerName, p.name, p.unit, String(p.qty), p.total.toFixed(2)])))
                downloadCSV(rows, 'bayi-urun-raporu.csv')
              })}
            </div>
            {bayiUrunGroups.length === 0
              ? <p style={{ padding: 40, textAlign: 'center', color: '#888', margin: 0 }}>Veri yok</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f5f2ec' }}>
                    {['Bayi / Ürün', 'Birim', 'Toplam Adet', 'Toplam Tutar (KDV dahil)'].map(h => <th key={h} style={thS}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {bayiUrunGroups.map(g => (
                      <>
                        {/* Dealer header row */}
                        <tr key={g.dealerId} style={{ background: '#f5f2ec' }}>
                          <td colSpan={2} style={{ padding: '9px 14px', fontWeight: 700, fontSize: 13, color: '#0f0f0f' }}>{g.dealerName}</td>
                          <td style={{ padding: '9px 14px', fontWeight: 700, textAlign: 'right', color: '#555' }}>{fmtQty(g.dealerQty)}</td>
                          <td style={{ padding: '9px 14px', fontWeight: 700, color: '#0f0f0f' }}>{fmt(g.dealerTotal)}</td>
                        </tr>
                        {/* Product rows */}
                        {g.products.map((p, pi) => (
                          <tr key={pi} style={{ borderBottom: '1px solid rgba(15,15,15,0.04)' }}>
                            <td style={{ padding: '8px 14px 8px 28px', color: '#374151' }}>{p.name}</td>
                            <td style={{ padding: '8px 14px', color: '#888', fontSize: 12 }}>{p.unit}</td>
                            <td style={{ padding: '8px 14px', color: '#555' }}>{fmtQty(p.qty)}</td>
                            <td style={{ padding: '8px 14px', fontWeight: 500 }}>{fmt(p.total)}</td>
                          </tr>
                        ))}
                      </>
                    ))}
                    <tr style={totalRowS}>
                      <td style={{ padding: '10px 14px' }} colSpan={2}>Genel Toplam</td>
                      <td style={{ padding: '10px 14px' }}>{fmtQty(bayiUrunGroups.reduce((s, g) => s + g.dealerQty, 0))}</td>
                      <td style={{ padding: '10px 14px' }}>{fmt(bayiUrunGroups.reduce((s, g) => s + g.dealerTotal, 0))}</td>
                    </tr>
                  </tbody>
                </table>
            }
          </div>
        )}

        {/* ── Dönemsel ── */}
        {view === 'donemsel' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Dönemsel Özet</span>
              {csvBtn(() => downloadCSV(
                [['Dönem', 'Sipariş Sayısı', 'Toplam Tutar (₺)'],
                 ...donemRows.map(r => [r.month, String(r.count), r.total.toFixed(2)])],
                'donemsel-raporu.csv'
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f5f2ec' }}>
                {['Dönem', 'Sipariş Sayısı', 'Toplam Tutar'].map(h => <th key={h} style={thS}>{h}</th>)}
              </tr></thead>
              <tbody>
                {donemRows.length === 0
                  ? <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                  : donemRows.map((r, i) => <tr key={i}>
                      <td style={{ ...tdS, fontWeight: 500 }}>{r.month}</td>
                      <td style={{ ...tdS, color: '#555' }}>{r.count}</td>
                      <td style={{ ...tdS, fontWeight: 600 }}>{fmt(r.total)}</td>
                    </tr>)
                }
                {donemRows.length > 0 && <tr style={totalRowS}>
                  <td style={{ padding: '10px 14px' }}>Toplam</td>
                  <td style={{ padding: '10px 14px' }}>{donemRows.reduce((s, r) => s + r.count, 0)}</td>
                  <td style={{ padding: '10px 14px' }}>{fmt(donemRows.reduce((s, r) => s + r.total, 0))}</td>
                </tr>}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
