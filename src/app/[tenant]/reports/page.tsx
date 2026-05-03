'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import type { ReactElement } from 'react'

type ViewType = 'bayi' | 'bayi-kategori' | 'urun' | 'urun-agac' | 'bayi-urun' | 'donemsel'

type ProductLeaf = { productId: string; name: string; unit: string; qty: number; total: number }
type TreeNode    = { id: string; label: string; qty: number; total: number; children: TreeNode[]; products: ProductLeaf[] }
type BayiTree    = { dealerId: string; dealerName: string; nodes: TreeNode[]; directProducts: ProductLeaf[]; dealerQty: number; dealerTotal: number }

const VIEWS: { key: ViewType; label: string }[] = [
  { key: 'bayi',          label: 'Bayi Bazlı' },
  { key: 'bayi-kategori', label: 'Bayi Kategorisi' },
  { key: 'urun',          label: 'Ürün Bazlı' },
  { key: 'urun-agac',     label: 'Ürün Ağacı' },
  { key: 'bayi-urun',     label: 'Bayi × Ürün' },
  { key: 'donemsel',      label: 'Dönemsel' },
]

export default function ReportsPage() {
  const params  = useParams()
  const slug    = params.tenant as string
  const supabase = createClient()
  const router  = useRouter()

  const [loading, setLoading]           = useState(true)
  const [tenantName, setTenantName]     = useState('')
  const [orders, setOrders]             = useState<any[]>([])
  const [orderItems, setOrderItems]     = useState<any[]>([])
  const [dealers, setDealers]           = useState<any[]>([])
  const [dealerCats, setDealerCats]     = useState<any[]>([])
  const [payments, setPayments]         = useState<any[]>([])
  const [levels, setLevels]             = useState<any[]>([])
  const [view, setView]                 = useState<ViewType>('bayi')
  const [filterFrom, setFilterFrom]     = useState('')
  const [filterTo, setFilterTo]         = useState('')
  const [expandedUrun, setExpandedUrun] = useState<Set<string>>(new Set())
  const [expandedBayi, setExpandedBayi] = useState<Set<string>>(new Set())

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) { router.push(`/${slug}/login`); return }
    const { data: td } = await supabase.from('tenants').select('id, name').eq('slug', slug).single()
    if (!td) { router.push('/'); return }
    setTenantName(td.name)

    const [
      { data: ordersData }, { data: dealersData }, { data: paymentsData },
      { data: catsData },  { data: levelsData },
    ] = await Promise.all([
      supabase.from('orders').select('id, dealer_id, status, total, created_at').eq('tenant_id', td.id),
      supabase.from('dealers').select('id, name, category_id').eq('tenant_id', td.id).order('name'),
      supabase.from('dealer_payments').select('dealer_id, amount').eq('tenant_id', td.id),
      supabase.from('dealer_categories').select('id, name').eq('tenant_id', td.id).order('name'),
      supabase.from('product_category_levels').select('id, name, sort_order').eq('tenant_id', td.id).order('sort_order'),
    ])

    setOrders(ordersData || [])
    setDealers(dealersData || [])
    setPayments(paymentsData || [])
    setDealerCats(catsData || [])
    setLevels(levelsData || [])

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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const orderMap = Object.fromEntries(orders.map(o => [o.id, o]))

  function filterOrders(os: any[]) {
    return os.filter(o => {
      if (o.status === 'CANCELLED') return false
      if (filterFrom && new Date(o.created_at) < new Date(filterFrom)) return false
      if (filterTo   && new Date(o.created_at) > new Date(filterTo + 'T23:59:59')) return false
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
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const fmt  = (n: number) => '₺' + n.toLocaleString('tr-TR', { maximumFractionDigits: 0 })
  const fmtN = (n: number) => n.toLocaleString('tr-TR')

  // ─── Tree builders ────────────────────────────────────────────────────────

  function buildProductLeaves(items: any[]): ProductLeaf[] {
    const map: Record<string, ProductLeaf> = {}
    items.forEach(i => {
      if (!map[i.product_id])
        map[i.product_id] = { productId: i.product_id, name: i.dealer_products?.name || 'Bilinmeyen', unit: i.dealer_products?.unit || '', qty: 0, total: 0 }
      map[i.product_id].qty   += Number(i.quantity)
      map[i.product_id].total += lineTotal(i)
    })
    return Object.values(map).sort((a, b) => a.name.localeCompare(b.name, 'tr'))
  }

  function buildCatTree(items: any[], levelIdx: number, pathPrefix: string): TreeNode[] {
    if (levelIdx >= levels.length) return []
    const level  = levels[levelIdx]
    const isLast = levelIdx === levels.length - 1
    const groups: Record<string, any[]> = {}
    items.forEach(i => {
      const val = i.dealer_products?.category_data?.[level.id] || 'Belirtilmemiş'
      if (!groups[val]) groups[val] = []
      groups[val].push(i)
    })
    return Object.entries(groups)
      .sort((a, b) => a[0].localeCompare(b[0], 'tr'))
      .map(([val, sub]) => ({
        id:       pathPrefix + val,
        label:    val,
        qty:      sub.reduce((s, i) => s + Number(i.quantity), 0),
        total:    sub.reduce((s, i) => s + lineTotal(i), 0),
        children: isLast ? [] : buildCatTree(sub, levelIdx + 1, pathPrefix + val + '/'),
        products: isLast ? buildProductLeaves(sub) : [],
      }))
  }

  function collectIds(nodes: TreeNode[]): string[] {
    return nodes.flatMap(n => [n.id, ...collectIds(n.children)])
  }

  function toggleSet(set: Set<string>, setFn: (s: Set<string>) => void, id: string) {
    const next = new Set(set)
    next.has(id) ? next.delete(id) : next.add(id)
    setFn(next)
  }

  // ─── Data builders ────────────────────────────────────────────────────────

  function getBayiRows() {
    const map: Record<string, { name: string; count: number; total: number; paid: number }> = {}
    filterOrders(orders).forEach((o: any) => {
      const d = dealers.find((x: any) => x.id === o.dealer_id)
      if (!map[o.dealer_id]) map[o.dealer_id] = { name: d?.name || 'Bilinmeyen', count: 0, total: 0, paid: 0 }
      map[o.dealer_id].count++; map[o.dealer_id].total += Number(o.total)
    })
    payments.forEach((p: any) => { if (map[p.dealer_id]) map[p.dealer_id].paid += Number(p.amount) })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  function getBayiKatRows() {
    const map: Record<string, { name: string; count: number; total: number; paid: number }> = {}
    filterOrders(orders).forEach((o: any) => {
      const d = dealers.find((x: any) => x.id === o.dealer_id)
      const catId = d?.category_id || '__none__'
      const cat = dealerCats.find((c: any) => c.id === catId)
      if (!map[catId]) map[catId] = { name: cat?.name || 'Kategorisiz', count: 0, total: 0, paid: 0 }
      map[catId].count++; map[catId].total += Number(o.total)
    })
    dealers.forEach((d: any) => {
      const catId = d.category_id || '__none__'
      if (!map[catId]) return
      map[catId].paid += payments.filter((p: any) => p.dealer_id === d.id).reduce((s: number, p: any) => s + Number(p.amount), 0)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  function getUrunRows() {
    const map: Record<string, { name: string; unit: string; qty: number; total: number }> = {}
    filteredItems().forEach((i: any) => {
      if (!map[i.product_id]) map[i.product_id] = { name: i.dealer_products?.name || 'Bilinmeyen', unit: i.dealer_products?.unit || '', qty: 0, total: 0 }
      map[i.product_id].qty += Number(i.quantity); map[i.product_id].total += lineTotal(i)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  function getUrunTree(): TreeNode[] {
    return buildCatTree(filteredItems(), 0, '')
  }

  function getBayiTrees(): BayiTree[] {
    const dealerMap: Record<string, any[]> = {}
    filteredItems().forEach((i: any) => {
      const order = orderMap[i.order_id]
      if (!order) return
      if (!dealerMap[order.dealer_id]) dealerMap[order.dealer_id] = []
      dealerMap[order.dealer_id].push(i)
    })
    return Object.entries(dealerMap).map(([dealerId, dItems]) => {
      const dealer = dealers.find((d: any) => d.id === dealerId)
      const prefix = `d:${dealerId}/`
      return {
        dealerId,
        dealerName:     dealer?.name || 'Bilinmeyen',
        nodes:          levels.length > 0 ? buildCatTree(dItems, 0, prefix) : [],
        directProducts: levels.length === 0 ? buildProductLeaves(dItems) : [],
        dealerQty:      dItems.reduce((s, i) => s + Number(i.quantity), 0),
        dealerTotal:    dItems.reduce((s, i) => s + lineTotal(i), 0),
      }
    }).sort((a, b) => b.dealerTotal - a.dealerTotal)
  }

  function getDonemRows() {
    const map: Record<string, { count: number; total: number }> = {}
    filterOrders(orders).forEach((o: any) => {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { count: 0, total: 0 }
      map[key].count++; map[key].total += Number(o.total)
    })
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0])).map(([key, v]) => {
      const [y, m] = key.split('-')
      return { month: new Date(Number(y), Number(m) - 1).toLocaleString('tr-TR', { month: 'long', year: 'numeric' }), ...v }
    })
  }

  // ─── Tree renderer ────────────────────────────────────────────────────────

  function renderCatNodes(nodes: TreeNode[], depth: number, expanded: Set<string>, onToggle: (id: string) => void): ReactElement[] {
    const rows: ReactElement[] = []
    const baseIndent = 14
    const indent = baseIndent + depth * 20
    const bg = depth === 0 ? '#f5f3f0' : depth === 1 ? '#fafaf8' : '#fdfdfc'

    nodes.forEach(node => {
      const isOpen = expanded.has(node.id)
      rows.push(
        <tr key={node.id} onClick={() => onToggle(node.id)}
          style={{ cursor: 'pointer', background: bg, borderBottom: '1px solid rgba(15,15,15,0.06)' }}>
          <td style={{ padding: `9px 14px 9px ${indent}px` }}>
            <span style={{ marginRight: 6, fontSize: 10, color: '#888', display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
            <span style={{ fontWeight: depth === 0 ? 700 : 600, color: '#111' }}>{node.label}</span>
          </td>
          <td style={{ padding: '9px 14px', color: '#ccc', fontSize: 12 }}>—</td>
          <td style={{ padding: '9px 14px', fontWeight: depth === 0 ? 700 : 600, color: '#374151' }}>{fmtN(node.qty)}</td>
          <td style={{ padding: '9px 14px', fontWeight: depth === 0 ? 700 : 600 }}>{fmt(node.total)}</td>
        </tr>
      )
      if (isOpen) {
        node.products.forEach((p, pi) => rows.push(
          <tr key={`${node.id}--p${pi}`} style={{ background: 'white', borderBottom: '1px solid rgba(15,15,15,0.03)' }}>
            <td style={{ padding: `7px 14px 7px ${indent + 20}px`, color: '#374151' }}>{p.name}</td>
            <td style={{ padding: '7px 14px', color: '#555', fontSize: 12 }}>{p.unit || '—'}</td>
            <td style={{ padding: '7px 14px', color: '#555' }}>{fmtN(p.qty)}</td>
            <td style={{ padding: '7px 14px', fontWeight: 500 }}>{fmt(p.total)}</td>
          </tr>
        ))
        rows.push(...renderCatNodes(node.children, depth + 1, expanded, onToggle))
      }
    })
    return rows
  }

  function renderProductLeaves(products: ProductLeaf[], indent: number): ReactElement[] {
    return products.map((p, pi) => (
      <tr key={`direct-p${pi}`} style={{ background: 'white', borderBottom: '1px solid rgba(15,15,15,0.03)' }}>
        <td style={{ padding: `7px 14px 7px ${indent}px`, color: '#374151' }}>{p.name}</td>
        <td style={{ padding: '7px 14px', color: '#555', fontSize: 12 }}>{p.unit || '—'}</td>
        <td style={{ padding: '7px 14px', color: '#555' }}>{fmtN(p.qty)}</td>
        <td style={{ padding: '7px 14px', fontWeight: 500 }}>{fmt(p.total)}</td>
      </tr>
    ))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  // ─── Styles ───────────────────────────────────────────────────────────────

  const inputSm: React.CSSProperties = { padding: '7px 10px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', background: 'white', color: '#111' }
  const thS: React.CSSProperties     = { padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)', whiteSpace: 'nowrap' }
  const tdS: React.CSSProperties     = { padding: '10px 14px', borderBottom: '1px solid rgba(15,15,15,0.05)' }
  const totalS: React.CSSProperties  = { background: '#f5f2ec', fontWeight: 700 }

  function csvBtn(onClick: () => void) {
    return <button onClick={onClick} style={{ padding: '6px 14px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>CSV İndir</button>
  }

  function expandCollapseBar(expandFn: () => void, collapseFn: () => void) {
    return (
      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={expandFn}   style={{ fontSize: 12, color: '#2d7a57', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Tümünü Aç</button>
        <button onClick={collapseFn} style={{ fontSize: 12, color: '#888',    background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}>Tümünü Kapat</button>
      </div>
    )
  }

  // ─── Computed data ────────────────────────────────────────────────────────

  const bayiRows   = view === 'bayi'          ? getBayiRows()   : []
  const bayiKatRows= view === 'bayi-kategori' ? getBayiKatRows(): []
  const urunRows   = view === 'urun'          ? getUrunRows()   : []
  const urunTree   = view === 'urun-agac'     ? getUrunTree()   : []
  const bayiTrees  = view === 'bayi-urun'     ? getBayiTrees()  : []
  const donemRows  = view === 'donemsel'      ? getDonemRows()  : []

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
            <input type="date" value={filterTo}   onChange={e => setFilterTo(e.target.value)}   style={inputSm} />
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
        {view === 'bayi' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Bayi Bazlı Özet</span>
              {csvBtn(() => downloadCSV([['Bayi','Sipariş Sayısı','Toplam Tutar (₺)','Ödenen (₺)','Kalan (₺)'], ...bayiRows.map(r => [r.name, String(r.count), r.total.toFixed(2), r.paid.toFixed(2), Math.max(0,r.total-r.paid).toFixed(2)])], 'bayi-raporu.csv'))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f5f2ec' }}>{['Bayi','Sipariş Sayısı','Toplam Tutar','Ödenen','Kalan'].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>
                {bayiRows.length === 0 ? <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                  : bayiRows.map((r, i) => { const kalan = Math.max(0, r.total - r.paid); return (
                    <tr key={i}>
                      <td style={{ ...tdS, fontWeight: 500 }}>{r.name}</td>
                      <td style={{ ...tdS, color: '#555' }}>{r.count}</td>
                      <td style={{ ...tdS, fontWeight: 600 }}>{fmt(r.total)}</td>
                      <td style={{ ...tdS, color: '#16a34a', fontWeight: 500 }}>{fmt(r.paid)}</td>
                      <td style={{ ...tdS, color: kalan > 0 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>{fmt(kalan)}</td>
                    </tr>
                  )})}
                {bayiRows.length > 0 && <tr style={totalS}>
                  <td style={{ padding: '10px 14px' }}>Toplam</td>
                  <td style={{ padding: '10px 14px' }}>{bayiRows.reduce((s,r) => s+r.count, 0)}</td>
                  <td style={{ padding: '10px 14px' }}>{fmt(bayiRows.reduce((s,r) => s+r.total, 0))}</td>
                  <td style={{ padding: '10px 14px', color: '#16a34a' }}>{fmt(bayiRows.reduce((s,r) => s+r.paid, 0))}</td>
                  <td style={{ padding: '10px 14px', color: '#dc2626' }}>{fmt(bayiRows.reduce((s,r) => s+Math.max(0,r.total-r.paid), 0))}</td>
                </tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Bayi Kategorisi ── */}
        {view === 'bayi-kategori' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Bayi Kategorisi Bazlı</span>
              {csvBtn(() => downloadCSV([['Kategori','Sipariş Sayısı','Toplam Tutar (₺)','Ödenen (₺)','Kalan (₺)'], ...bayiKatRows.map(r => [r.name, String(r.count), r.total.toFixed(2), r.paid.toFixed(2), Math.max(0,r.total-r.paid).toFixed(2)])], 'bayi-kategori-raporu.csv'))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f5f2ec' }}>{['Kategori','Sipariş Sayısı','Toplam Tutar','Ödenen','Kalan'].map(h => <th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>
                {bayiKatRows.length === 0 ? <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                  : bayiKatRows.map((r, i) => { const kalan = Math.max(0, r.total - r.paid); return (
                    <tr key={i}>
                      <td style={{ ...tdS, fontWeight: 500 }}>{r.name}</td>
                      <td style={{ ...tdS, color: '#555' }}>{r.count}</td>
                      <td style={{ ...tdS, fontWeight: 600 }}>{fmt(r.total)}</td>
                      <td style={{ ...tdS, color: '#16a34a', fontWeight: 500 }}>{fmt(r.paid)}</td>
                      <td style={{ ...tdS, color: kalan > 0 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>{fmt(kalan)}</td>
                    </tr>
                  )})}
                {bayiKatRows.length > 0 && <tr style={totalS}>
                  <td style={{ padding: '10px 14px' }}>Toplam</td>
                  <td style={{ padding: '10px 14px' }}>{bayiKatRows.reduce((s,r)=>s+r.count,0)}</td>
                  <td style={{ padding: '10px 14px' }}>{fmt(bayiKatRows.reduce((s,r)=>s+r.total,0))}</td>
                  <td style={{ padding: '10px 14px', color:'#16a34a'}}>{fmt(bayiKatRows.reduce((s,r)=>s+r.paid,0))}</td>
                  <td style={{ padding: '10px 14px', color:'#dc2626'}}>{fmt(bayiKatRows.reduce((s,r)=>s+Math.max(0,r.total-r.paid),0))}</td>
                </tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Ürün Bazlı ── */}
        {view === 'urun' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Ürün Bazlı Özet</span>
              {csvBtn(() => downloadCSV([['Ürün','Birim','Toplam Adet','Toplam Tutar (₺ KDV dahil)'], ...urunRows.map(r=>[r.name,r.unit,String(r.qty),r.total.toFixed(2)])], 'urun-raporu.csv'))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f5f2ec' }}>{['Ürün','Birim','Toplam Adet','Toplam Tutar (KDV dahil)'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>
                {urunRows.length === 0 ? <tr><td colSpan={4} style={{ padding:40, textAlign:'center', color:'#888'}}>Veri yok</td></tr>
                  : urunRows.map((r,i) => <tr key={i}>
                      <td style={{...tdS, fontWeight:500}}>{r.name}</td>
                      <td style={{...tdS, color:'#555'}}>{r.unit||'—'}</td>
                      <td style={{...tdS, color:'#555'}}>{fmtN(r.qty)}</td>
                      <td style={{...tdS, fontWeight:600}}>{fmt(r.total)}</td>
                    </tr>)
                }
                {urunRows.length > 0 && <tr style={totalS}>
                  <td style={{padding:'10px 14px'}} colSpan={2}>Toplam</td>
                  <td style={{padding:'10px 14px'}}>{fmtN(urunRows.reduce((s,r)=>s+r.qty,0))}</td>
                  <td style={{padding:'10px 14px'}}>{fmt(urunRows.reduce((s,r)=>s+r.total,0))}</td>
                </tr>}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Ürün Ağacı ── */}
        {view === 'urun-agac' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Ürün Ağacı</span>
                {levels.length > 0 && expandCollapseBar(
                  () => setExpandedUrun(new Set(collectIds(urunTree))),
                  () => setExpandedUrun(new Set())
                )}
              </div>
              {csvBtn(() => {
                const rows: string[][] = [['Seviye', 'Değer', 'Birim', 'Toplam Adet', 'Toplam Tutar (₺ KDV dahil)']]
                function collectCsv(nodes: TreeNode[], depth: number) {
                  nodes.forEach(n => {
                    const lvlName = levels[depth]?.name || ''
                    rows.push([lvlName, n.label, '', String(n.qty), n.total.toFixed(2)])
                    n.products.forEach(p => rows.push(['Ürün', p.name, p.unit, String(p.qty), p.total.toFixed(2)]))
                    collectCsv(n.children, depth + 1)
                  })
                }
                collectCsv(urunTree, 0)
                downloadCSV(rows, 'urun-agac-raporu.csv')
              })}
            </div>
            {levels.length === 0
              ? <p style={{ padding: 40, textAlign: 'center', color: '#888', margin: 0 }}>Ürün ağacı tanımlanmamış</p>
              : urunTree.length === 0
              ? <p style={{ padding: 40, textAlign: 'center', color: '#888', margin: 0 }}>Veri yok</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f5f2ec' }}>{[levels[0]?.name || 'Kategori', 'Birim', 'Toplam Adet', 'Toplam Tutar (KDV dahil)'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                  <tbody>
                    {renderCatNodes(urunTree, 0, expandedUrun, id => toggleSet(expandedUrun, setExpandedUrun, id))}
                    <tr style={totalS}>
                      <td style={{padding:'10px 14px'}} colSpan={2}>Toplam</td>
                      <td style={{padding:'10px 14px'}}>{fmtN(urunTree.reduce((s,n)=>s+n.qty,0))}</td>
                      <td style={{padding:'10px 14px'}}>{fmt(urunTree.reduce((s,n)=>s+n.total,0))}</td>
                    </tr>
                  </tbody>
                </table>
            }
          </div>
        )}

        {/* ── Bayi × Ürün ── */}
        {view === 'bayi-urun' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>Bayi × Ürün</span>
                {expandCollapseBar(
                  () => {
                    const all = new Set<string>()
                    bayiTrees.forEach(g => { all.add(g.dealerId); collectIds(g.nodes).forEach(id => all.add(id)) })
                    setExpandedBayi(all)
                  },
                  () => setExpandedBayi(new Set())
                )}
              </div>
              {csvBtn(() => {
                const rows: string[][] = [['Bayi', 'Seviye', 'Değer', 'Birim', 'Toplam Adet', 'Toplam Tutar (₺ KDV dahil)']]
                function collectBayiCsv(dealerName: string, nodes: TreeNode[], depth: number) {
                  nodes.forEach(n => {
                    const lvlName = levels[depth]?.name || ''
                    rows.push([dealerName, lvlName, n.label, '', String(n.qty), n.total.toFixed(2)])
                    n.products.forEach(p => rows.push([dealerName, 'Ürün', p.name, p.unit, String(p.qty), p.total.toFixed(2)]))
                    collectBayiCsv(dealerName, n.children, depth + 1)
                  })
                }
                bayiTrees.forEach(g => {
                  g.directProducts.forEach(p => rows.push([g.dealerName, 'Ürün', p.name, p.unit, String(p.qty), p.total.toFixed(2)]))
                  collectBayiCsv(g.dealerName, g.nodes, 0)
                })
                downloadCSV(rows, 'bayi-urun-raporu.csv')
              })}
            </div>
            {bayiTrees.length === 0
              ? <p style={{ padding: 40, textAlign: 'center', color: '#888', margin: 0 }}>Veri yok</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f5f2ec' }}>{['Bayi / Kategori / Ürün','Birim','Toplam Adet','Toplam Tutar (KDV dahil)'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
                  <tbody>
                    {bayiTrees.map(g => {
                      const isDealerOpen = expandedBayi.has(g.dealerId)
                      return [
                        // Dealer row
                        <tr key={g.dealerId} onClick={() => toggleSet(expandedBayi, setExpandedBayi, g.dealerId)}
                          style={{ cursor: 'pointer', background: '#f0ede8', borderBottom: '1px solid rgba(15,15,15,0.1)' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <span style={{ marginRight: 8, fontSize: 10, color: '#888', display: 'inline-block', transform: isDealerOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>▶</span>
                            <span style={{ fontWeight: 700, fontSize: 14 }}>{g.dealerName}</span>
                          </td>
                          <td style={{ padding: '11px 14px', color: '#ccc' }}>—</td>
                          <td style={{ padding: '11px 14px', fontWeight: 700 }}>{fmtN(g.dealerQty)}</td>
                          <td style={{ padding: '11px 14px', fontWeight: 700 }}>{fmt(g.dealerTotal)}</td>
                        </tr>,
                        // Children
                        ...(isDealerOpen
                          ? g.nodes.length > 0
                            ? renderCatNodes(g.nodes, 1, expandedBayi, id => toggleSet(expandedBayi, setExpandedBayi, id))
                            : renderProductLeaves(g.directProducts, 34)
                          : []
                        )
                      ]
                    })}
                    <tr style={totalS}>
                      <td style={{padding:'10px 14px'}} colSpan={2}>Genel Toplam</td>
                      <td style={{padding:'10px 14px'}}>{fmtN(bayiTrees.reduce((s,g)=>s+g.dealerQty,0))}</td>
                      <td style={{padding:'10px 14px'}}>{fmt(bayiTrees.reduce((s,g)=>s+g.dealerTotal,0))}</td>
                    </tr>
                  </tbody>
                </table>
            }
          </div>
        )}

        {/* ── Dönemsel ── */}
        {view === 'donemsel' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Dönemsel Özet</span>
              {csvBtn(() => downloadCSV([['Dönem','Sipariş Sayısı','Toplam Tutar (₺)'], ...donemRows.map(r=>[r.month,String(r.count),r.total.toFixed(2)])], 'donemsel-raporu.csv'))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f5f2ec' }}>{['Dönem','Sipariş Sayısı','Toplam Tutar'].map(h=><th key={h} style={thS}>{h}</th>)}</tr></thead>
              <tbody>
                {donemRows.length === 0 ? <tr><td colSpan={3} style={{padding:40,textAlign:'center',color:'#888'}}>Veri yok</td></tr>
                  : donemRows.map((r,i) => <tr key={i}>
                      <td style={{...tdS,fontWeight:500}}>{r.month}</td>
                      <td style={{...tdS,color:'#555'}}>{r.count}</td>
                      <td style={{...tdS,fontWeight:600}}>{fmt(r.total)}</td>
                    </tr>)
                }
                {donemRows.length > 0 && <tr style={totalS}>
                  <td style={{padding:'10px 14px'}}>Toplam</td>
                  <td style={{padding:'10px 14px'}}>{donemRows.reduce((s,r)=>s+r.count,0)}</td>
                  <td style={{padding:'10px 14px'}}>{fmt(donemRows.reduce((s,r)=>s+r.total,0))}</td>
                </tr>}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
