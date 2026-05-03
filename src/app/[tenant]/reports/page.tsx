'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type ViewType = 'bayi' | 'bayi-kategori' | 'urun' | 'urun-agac' | 'bayi-urun' | 'donemsel'

const VIEWS: { key: ViewType; label: string }[] = [
  { key: 'bayi',          label: 'Bayi Bazlı' },
  { key: 'bayi-kategori', label: 'Bayi Kategorisi' },
  { key: 'urun',          label: 'Ürün Bazlı' },
  { key: 'urun-agac',     label: 'Ürün Ağacı' },
  { key: 'bayi-urun',     label: 'Bayi × Ürün' },
  { key: 'donemsel',      label: 'Dönemsel' },
]

type ProductRow = { name: string; unit: string; categoryPath: string; qty: number; total: number }
type BayiUrunGroup = { dealerId: string; dealerName: string; products: ProductRow[]; dealerTotal: number; dealerQty: number }

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
  const [expandedDealers, setExpandedDealers] = useState<Set<string>>(new Set())

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

  function categoryPath(catData: any) {
    if (!catData || !levels.length) return ''
    return levels.map(l => catData[l.id]).filter(Boolean).join(' › ')
  }

  function downloadCSV(rows: string[][], filename: string) {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function fmt(n: number) { return '₺' + n.toLocaleString('tr-TR', { maximumFractionDigits: 0 }) }
  function fmtN(n: number) { return n.toLocaleString('tr-TR') }

  function toggleDealer(id: string) {
    setExpandedDealers(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // ─── Data builders ───────────────────────────────────────────────────────

  function getBayiRows() {
    const map: Record<string, { name: string; count: number; total: number; paid: number }> = {}
    filterOrders(orders).forEach((o: any) => {
      const d = dealers.find((x: any) => x.id === o.dealer_id)
      if (!map[o.dealer_id]) map[o.dealer_id] = { name: d?.name || 'Bilinmeyen', count: 0, total: 0, paid: 0 }
      map[o.dealer_id].count += 1
      map[o.dealer_id].total += Number(o.total)
    })
    payments.forEach((p: any) => { if (map[p.dealer_id]) map[p.dealer_id].paid += Number(p.amount) })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  function getBayiKategoriRows() {
    const map: Record<string, { name: string; count: number; total: number; paid: number }> = {}
    filterOrders(orders).forEach((o: any) => {
      const d = dealers.find((x: any) => x.id === o.dealer_id)
      const catId = d?.category_id || '__none__'
      const cat = dealerCategories.find((c: any) => c.id === catId)
      if (!map[catId]) map[catId] = { name: cat?.name || 'Kategorisiz', count: 0, total: 0, paid: 0 }
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

  function getUrunRows() {
    const map: Record<string, { name: string; unit: string; qty: number; total: number }> = {}
    filteredItems().forEach((i: any) => {
      if (!map[i.product_id]) map[i.product_id] = { name: i.dealer_products?.name || 'Bilinmeyen', unit: i.dealer_products?.unit || '', qty: 0, total: 0 }
      map[i.product_id].qty += Number(i.quantity)
      map[i.product_id].total += lineTotal(i)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  function getUrunAgacRows() {
    if (!selectedLevel) return []
    const map: Record<string, { name: string; productIds: Set<string>; qty: number; total: number }> = {}
    filteredItems().forEach((i: any) => {
      const val = i.dealer_products?.category_data?.[selectedLevel] || 'Belirtilmemiş'
      if (!map[val]) map[val] = { name: val, productIds: new Set(), qty: 0, total: 0 }
      map[val].productIds.add(i.product_id)
      map[val].qty += Number(i.quantity)
      map[val].total += lineTotal(i)
    })
    return Object.values(map).sort((a, b) => b.total - a.total).map(r => ({ name: r.name, productCount: r.productIds.size, qty: r.qty, total: r.total }))
  }

  function getBayiUrunGroups(): BayiUrunGroup[] {
    const dealerMap: Record<string, Record<string, ProductRow>> = {}
    filteredItems().forEach((i: any) => {
      const order = orderMap[i.order_id]
      if (!order) return
      const dealerId = order.dealer_id
      const path = categoryPath(i.dealer_products?.category_data)
      if (!dealerMap[dealerId]) dealerMap[dealerId] = {}
      if (!dealerMap[dealerId][i.product_id])
        dealerMap[dealerId][i.product_id] = { name: i.dealer_products?.name || 'Bilinmeyen', unit: i.dealer_products?.unit || '', categoryPath: path, qty: 0, total: 0 }
      dealerMap[dealerId][i.product_id].qty += Number(i.quantity)
      dealerMap[dealerId][i.product_id].total += lineTotal(i)
    })
    return Object.entries(dealerMap).map(([dealerId, prodMap]) => {
      const dealer = dealers.find((d: any) => d.id === dealerId)
      const products = Object.values(prodMap).sort((a, b) => {
        const cp = a.categoryPath.localeCompare(b.categoryPath, 'tr')
        return cp !== 0 ? cp : a.name.localeCompare(b.name, 'tr')
      })
      return { dealerId, dealerName: dealer?.name || 'Bilinmeyen', products, dealerTotal: products.reduce((s, p) => s + p.total, 0), dealerQty: products.reduce((s, p) => s + p.qty, 0) }
    }).sort((a, b) => b.dealerTotal - a.dealerTotal)
  }

  function getDonemselRows() {
    const map: Record<string, { count: number; total: number }> = {}
    filterOrders(orders).forEach((o: any) => {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { count: 0, total: 0 }
      map[key].count += 1; map[key].total += Number(o.total)
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

  // ─── Style helpers ────────────────────────────────────────────────────────

  const inputSm: React.CSSProperties = { padding: '7px 10px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white', color: '#111' }
  const thS: React.CSSProperties = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)', whiteSpace: 'nowrap' }
  const tdS: React.CSSProperties = { padding: '10px 14px', borderBottom: '1px solid rgba(15,15,15,0.05)' }
  const totalS: React.CSSProperties = { background: '#f5f2ec', fontWeight: 700 }

  function csvBtn(onClick: () => void) {
    return <button onClick={onClick} style={{ padding: '6px 14px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>CSV İndir</button>
  }

  function tableWrap(children: React.ReactNode, title: string, csvOnClick: () => void, extra?: React.ReactNode) {
    return (
      <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{title}</span>
            {extra}
          </div>
          {csvBtn(csvOnClick)}
        </div>
        {children}
      </div>
    )
  }

  // ─── Compute rows ─────────────────────────────────────────────────────────

  const bayiRows        = view === 'bayi'          ? getBayiRows()         : []
  const bayiKatRows     = view === 'bayi-kategori' ? getBayiKategoriRows() : []
  const urunRows        = view === 'urun'          ? getUrunRows()         : []
  const agacRows        = view === 'urun-agac'     ? getUrunAgacRows()     : []
  const bayiUrunGroups  = view === 'bayi-urun'     ? getBayiUrunGroups()   : []
  const donemRows       = view === 'donemsel'      ? getDonemselRows()     : []
  const selectedLevelName = levels.find(l => l.id === selectedLevel)?.name || ''

  function sumRow(items: any[], keys: string[]) {
    const sums: Record<string, number> = {}
    keys.forEach(k => { sums[k] = items.reduce((s, r) => s + (r[k] || 0), 0) })
    return sums
  }

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

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(15,15,15,0.1)', marginBottom: 20, flexWrap: 'wrap' }}>
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              style={{ padding: '10px 18px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: view === v.key ? '2px solid #0f0f0f' : '2px solid transparent', background: 'none', cursor: 'pointer', color: view === v.key ? '#0f0f0f' : '#888', marginBottom: -1, whiteSpace: 'nowrap' }}>
              {v.label}
            </button>
          ))}
        </div>

        {/* ── Bayi Bazlı ── */}
        {view === 'bayi' && tableWrap(
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
                })
              }
              {bayiRows.length > 0 && <tr style={totalS}>
                <td style={{ padding: '10px 14px' }}>Toplam</td>
                <td style={{ padding: '10px 14px' }}>{bayiRows.reduce((s, r) => s + r.count, 0)}</td>
                <td style={{ padding: '10px 14px' }}>{fmt(bayiRows.reduce((s, r) => s + r.total, 0))}</td>
                <td style={{ padding: '10px 14px', color: '#16a34a' }}>{fmt(bayiRows.reduce((s, r) => s + r.paid, 0))}</td>
                <td style={{ padding: '10px 14px', color: '#dc2626' }}>{fmt(bayiRows.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0))}</td>
              </tr>}
            </tbody>
          </table>,
          'Bayi Bazlı Özet',
          () => downloadCSV(
            [['Bayi', 'Sipariş Sayısı', 'Toplam Tutar (₺)', 'Ödenen (₺)', 'Kalan (₺)'],
             ...bayiRows.map(r => [r.name, String(r.count), r.total.toFixed(2), r.paid.toFixed(2), Math.max(0, r.total - r.paid).toFixed(2)])],
            'bayi-raporu.csv')
        )}

        {/* ── Bayi Kategorisi ── */}
        {view === 'bayi-kategori' && tableWrap(
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
                })
              }
              {bayiKatRows.length > 0 && <tr style={totalS}>
                <td style={{ padding: '10px 14px' }}>Toplam</td>
                <td style={{ padding: '10px 14px' }}>{bayiKatRows.reduce((s, r) => s + r.count, 0)}</td>
                <td style={{ padding: '10px 14px' }}>{fmt(bayiKatRows.reduce((s, r) => s + r.total, 0))}</td>
                <td style={{ padding: '10px 14px', color: '#16a34a' }}>{fmt(bayiKatRows.reduce((s, r) => s + r.paid, 0))}</td>
                <td style={{ padding: '10px 14px', color: '#dc2626' }}>{fmt(bayiKatRows.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0))}</td>
              </tr>}
            </tbody>
          </table>,
          'Bayi Kategorisi Bazlı',
          () => downloadCSV(
            [['Kategori', 'Sipariş Sayısı', 'Toplam Tutar (₺)', 'Ödenen (₺)', 'Kalan (₺)'],
             ...bayiKatRows.map(r => [r.name, String(r.count), r.total.toFixed(2), r.paid.toFixed(2), Math.max(0, r.total - r.paid).toFixed(2)])],
            'bayi-kategori-raporu.csv')
        )}

        {/* ── Ürün Bazlı ── */}
        {view === 'urun' && tableWrap(
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr style={{ background: '#f5f2ec' }}>
              {['Ürün', 'Birim', 'Toplam Adet', 'Toplam Tutar (KDV dahil)'].map(h => <th key={h} style={thS}>{h}</th>)}
            </tr></thead>
            <tbody>
              {urunRows.length === 0
                ? <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                : urunRows.map((r, i) => <tr key={i}>
                    <td style={{ ...tdS, fontWeight: 500 }}>{r.name}</td>
                    <td style={{ ...tdS, color: '#555' }}>{r.unit || '—'}</td>
                    <td style={{ ...tdS, color: '#555' }}>{fmtN(r.qty)}</td>
                    <td style={{ ...tdS, fontWeight: 600 }}>{fmt(r.total)}</td>
                  </tr>)
              }
              {urunRows.length > 0 && <tr style={totalS}>
                <td style={{ padding: '10px 14px' }} colSpan={2}>Toplam</td>
                <td style={{ padding: '10px 14px' }}>{fmtN(urunRows.reduce((s, r) => s + r.qty, 0))}</td>
                <td style={{ padding: '10px 14px' }}>{fmt(urunRows.reduce((s, r) => s + r.total, 0))}</td>
              </tr>}
            </tbody>
          </table>,
          'Ürün Bazlı Özet',
          () => downloadCSV(
            [['Ürün', 'Birim', 'Toplam Adet', 'Toplam Tutar (₺ KDV dahil)'],
             ...urunRows.map(r => [r.name, r.unit, String(r.qty), r.total.toFixed(2)])],
            'urun-raporu.csv')
        )}

        {/* ── Ürün Ağacı ── */}
        {view === 'urun-agac' && tableWrap(
          levels.length === 0
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
                        <td style={{ ...tdS, color: '#555' }}>{fmtN(r.qty)}</td>
                        <td style={{ ...tdS, fontWeight: 600 }}>{fmt(r.total)}</td>
                      </tr>)
                  }
                  {agacRows.length > 0 && <tr style={totalS}>
                    <td style={{ padding: '10px 14px' }} colSpan={2}>Toplam</td>
                    <td style={{ padding: '10px 14px' }}>{fmtN(agacRows.reduce((s, r) => s + r.qty, 0))}</td>
                    <td style={{ padding: '10px 14px' }}>{fmt(agacRows.reduce((s, r) => s + r.total, 0))}</td>
                  </tr>}
                </tbody>
              </table>,
          'Ürün Ağacı Bazlı',
          () => downloadCSV(
            [[selectedLevelName, '# Ürün', 'Toplam Adet', 'Toplam Tutar (₺ KDV dahil)'],
             ...agacRows.map(r => [r.name, String(r.productCount), String(r.qty), r.total.toFixed(2)])],
            'urun-agac-raporu.csv'),
          levels.length > 1
            ? <select value={selectedLevel} onChange={e => setSelectedLevel(e.target.value)} style={{ ...inputSm, padding: '5px 10px' }}>
                {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            : undefined
        )}

        {/* ── Bayi × Ürün ── */}
        {view === 'bayi-urun' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Bayi × Ürün</span>
                <button onClick={() => setExpandedDealers(new Set(bayiUrunGroups.map(g => g.dealerId)))}
                  style={{ fontSize: 12, color: '#2d7a57', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Tümünü Aç</button>
                <button onClick={() => setExpandedDealers(new Set())}
                  style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Tümünü Kapat</button>
              </div>
              {csvBtn(() => {
                const rows: string[][] = [['Bayi', 'Ürün Ağacı', 'Ürün', 'Birim', 'Toplam Adet', 'Toplam Tutar (₺ KDV dahil)']]
                bayiUrunGroups.forEach(g => g.products.forEach(p => rows.push([g.dealerName, p.categoryPath, p.name, p.unit, String(p.qty), p.total.toFixed(2)])))
                downloadCSV(rows, 'bayi-urun-raporu.csv')
              })}
            </div>
            {bayiUrunGroups.length === 0
              ? <p style={{ padding: 40, textAlign: 'center', color: '#888', margin: 0 }}>Veri yok</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f5f2ec' }}>
                      <th style={{ ...thS, width: 28 }}></th>
                      <th style={thS}>Bayi / Ürün</th>
                      <th style={thS}>Ürün Ağacı</th>
                      <th style={thS}>Birim</th>
                      <th style={thS}>Toplam Adet</th>
                      <th style={thS}>Toplam Tutar (KDV dahil)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bayiUrunGroups.map(g => {
                      const isOpen = expandedDealers.has(g.dealerId)
                      return (
                        <>
                          {/* Dealer row */}
                          <tr key={g.dealerId} onClick={() => toggleDealer(g.dealerId)} style={{ background: '#f9f7f4', cursor: 'pointer', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
                            <td style={{ padding: '10px 8px 10px 14px' }}>
                              <span style={{ fontSize: 11, color: '#888', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f0f0f' }}>{g.dealerName}</td>
                            <td style={{ padding: '10px 14px', color: '#aaa', fontSize: 12 }}>{g.products.length} ürün çeşidi</td>
                            <td style={{ padding: '10px 14px' }}></td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#374151' }}>{fmtN(g.dealerQty)}</td>
                            <td style={{ padding: '10px 14px', fontWeight: 700 }}>{fmt(g.dealerTotal)}</td>
                          </tr>
                          {/* Product rows */}
                          {isOpen && g.products.map((p, pi) => (
                            <tr key={pi} style={{ borderBottom: '1px solid rgba(15,15,15,0.04)', background: 'white' }}>
                              <td style={{ padding: '8px 8px 8px 14px' }}></td>
                              <td style={{ padding: '8px 14px 8px 28px', color: '#374151', fontWeight: 500 }}>{p.name}</td>
                              <td style={{ padding: '8px 14px', color: '#888', fontSize: 12 }}>{p.categoryPath || '—'}</td>
                              <td style={{ padding: '8px 14px', color: '#555', fontSize: 12 }}>{p.unit || '—'}</td>
                              <td style={{ padding: '8px 14px', color: '#555' }}>{fmtN(p.qty)}</td>
                              <td style={{ padding: '8px 14px', fontWeight: 500 }}>{fmt(p.total)}</td>
                            </tr>
                          ))}
                        </>
                      )
                    })}
                    <tr style={totalS}>
                      <td style={{ padding: '10px 14px' }} colSpan={4}>Genel Toplam</td>
                      <td style={{ padding: '10px 14px' }}>{fmtN(bayiUrunGroups.reduce((s, g) => s + g.dealerQty, 0))}</td>
                      <td style={{ padding: '10px 14px' }}>{fmt(bayiUrunGroups.reduce((s, g) => s + g.dealerTotal, 0))}</td>
                    </tr>
                  </tbody>
                </table>
            }
          </div>
        )}

        {/* ── Dönemsel ── */}
        {view === 'donemsel' && tableWrap(
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
              {donemRows.length > 0 && <tr style={totalS}>
                <td style={{ padding: '10px 14px' }}>Toplam</td>
                <td style={{ padding: '10px 14px' }}>{donemRows.reduce((s, r) => s + r.count, 0)}</td>
                <td style={{ padding: '10px 14px' }}>{fmt(donemRows.reduce((s, r) => s + r.total, 0))}</td>
              </tr>}
            </tbody>
          </table>,
          'Dönemsel Özet',
          () => downloadCSV(
            [['Dönem', 'Sipariş Sayısı', 'Toplam Tutar (₺)'],
             ...donemRows.map(r => [r.month, String(r.count), r.total.toFixed(2)])],
            'donemsel-raporu.csv')
        )}

      </div>
    </div>
  )
}
