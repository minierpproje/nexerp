'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

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
  const [payments, setPayments] = useState<any[]>([])
  const [tab, setTab] = useState<'bayi' | 'urun' | 'donemsel'>('bayi')
  const [filterFrom, setFilterFrom] = useState('')
  const [filterTo, setFilterTo] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase.from('tenants').select('id, name').eq('slug', slug).single()
    if (!tenantData) { router.push('/'); return }
    setTenantName(tenantData.name)

    const [{ data: ordersData }, { data: dealersData }, { data: paymentsData }] = await Promise.all([
      supabase.from('orders').select('id, dealer_id, status, total, created_at').eq('tenant_id', tenantData.id),
      supabase.from('dealers').select('id, name').eq('tenant_id', tenantData.id).order('name'),
      supabase.from('dealer_payments').select('dealer_id, amount').eq('tenant_id', tenantData.id),
    ])

    setOrders(ordersData || [])
    setDealers(dealersData || [])
    setPayments(paymentsData || [])

    const orderIds = (ordersData || []).map((o: any) => o.id)
    if (orderIds.length > 0) {
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('order_id, product_id, quantity, unit_price, vat_rate, dealer_products(name, unit)')
        .in('order_id', orderIds)
      setOrderItems(itemsData || [])
    }

    setLoading(false)
  }

  function filterOrders(os: any[]) {
    return os.filter(o => {
      if (o.status === 'CANCELLED') return false
      if (filterFrom && new Date(o.created_at) < new Date(filterFrom)) return false
      if (filterTo && new Date(o.created_at) > new Date(filterTo + 'T23:59:59')) return false
      return true
    })
  }

  function downloadCSV(rows: string[][], filename: string) {
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  function getBayiRows() {
    const filtered = filterOrders(orders)
    const map: Record<string, { name: string; count: number; total: number; paid: number }> = {}
    filtered.forEach(o => {
      const dealer = dealers.find((d: any) => d.id === o.dealer_id)
      const name = dealer?.name || 'Bilinmeyen'
      if (!map[o.dealer_id]) map[o.dealer_id] = { name, count: 0, total: 0, paid: 0 }
      map[o.dealer_id].count += 1
      map[o.dealer_id].total += Number(o.total)
    })
    payments.forEach((p: any) => {
      if (map[p.dealer_id]) map[p.dealer_id].paid += Number(p.amount)
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  function getUrunRows() {
    const filteredIds = new Set(filterOrders(orders).map((o: any) => o.id))
    const map: Record<string, { name: string; unit: string; qty: number; total: number }> = {}
    orderItems.filter((i: any) => filteredIds.has(i.order_id)).forEach((i: any) => {
      const name = i.dealer_products?.name || 'Bilinmeyen'
      const unit = i.dealer_products?.unit || ''
      const vatMultiplier = 1 + (Number(i.vat_rate) || 0) / 100
      const lineTotal = Number(i.unit_price) * Number(i.quantity) * vatMultiplier
      if (!map[i.product_id]) map[i.product_id] = { name, unit, qty: 0, total: 0 }
      map[i.product_id].qty += Number(i.quantity)
      map[i.product_id].total += lineTotal
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }

  function getDonemselRows() {
    const filtered = filterOrders(orders)
    const map: Record<string, { count: number; total: number }> = {}
    filtered.forEach((o: any) => {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!map[key]) map[key] = { count: 0, total: 0 }
      map[key].count += 1
      map[key].total += Number(o.total)
    })
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, v]) => {
        const [y, m] = key.split('-')
        const monthName = new Date(Number(y), Number(m) - 1).toLocaleString('tr-TR', { month: 'long', year: 'numeric' })
        return { month: monthName, ...v }
      })
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  const bayiRows = getBayiRows()
  const urunRows = getUrunRows()
  const donemselRows = getDonemselRows()

  const inputSm: React.CSSProperties = {
    padding: '7px 10px', border: '1px solid rgba(15,15,15,0.15)',
    borderRadius: 8, fontSize: 13, outline: 'none', background: 'white', color: '#111',
  }
  const thStyle: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: 11, color: '#888',
    fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em',
    borderBottom: '1px solid rgba(15,15,15,0.08)',
  }
  const tdStyle: React.CSSProperties = { padding: '11px 14px', borderBottom: '1px solid rgba(15,15,15,0.06)' }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <Link href={`/${slug}/dashboard`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(15,15,15,0.07)', border: 'none', borderRadius: 8, fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 500 }}>← {tenantName}</Link>
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
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(15,15,15,0.1)', marginBottom: 20 }}>
          {([['bayi', 'Bayi Bazlı'], ['urun', 'Ürün Bazlı'], ['donemsel', 'Dönemsel']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{ padding: '10px 20px', fontSize: 13, fontWeight: 500, border: 'none', borderBottom: tab === key ? '2px solid #0f0f0f' : '2px solid transparent', background: 'none', cursor: 'pointer', color: tab === key ? '#0f0f0f' : '#888', marginBottom: -1 }}>
              {label}
            </button>
          ))}
        </div>

        {/* Bayi Bazlı */}
        {tab === 'bayi' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Bayi Bazlı Özet</span>
              <button onClick={() => downloadCSV(
                [['Bayi', 'Sipariş Sayısı', 'Toplam Tutar (₺)', 'Ödenen (₺)', 'Kalan (₺)'],
                 ...bayiRows.map(r => [r.name, String(r.count), r.total.toFixed(2), r.paid.toFixed(2), Math.max(0, r.total - r.paid).toFixed(2)])],
                'bayi-raporu.csv'
              )} style={{ padding: '6px 14px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                CSV İndir
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f2ec' }}>
                  {['Bayi', 'Sipariş Sayısı', 'Toplam Tutar', 'Ödenen', 'Kalan'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {bayiRows.length === 0
                  ? <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                  : bayiRows.map((r, i) => {
                      const kalan = Math.max(0, r.total - r.paid)
                      return (
                        <tr key={i}>
                          <td style={{ ...tdStyle, fontWeight: 500 }}>{r.name}</td>
                          <td style={{ ...tdStyle, color: '#555' }}>{r.count}</td>
                          <td style={{ ...tdStyle, fontWeight: 600 }}>₺{r.total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                          <td style={{ ...tdStyle, color: '#16a34a', fontWeight: 500 }}>₺{r.paid.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                          <td style={{ ...tdStyle, color: kalan > 0 ? '#dc2626' : '#16a34a', fontWeight: 500 }}>₺{kalan.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                        </tr>
                      )
                    })
                }
                {bayiRows.length > 0 && (
                  <tr style={{ background: '#f5f2ec', fontWeight: 700 }}>
                    <td style={{ padding: '10px 14px' }}>Toplam</td>
                    <td style={{ padding: '10px 14px' }}>{bayiRows.reduce((s, r) => s + r.count, 0)}</td>
                    <td style={{ padding: '10px 14px' }}>₺{bayiRows.reduce((s, r) => s + r.total, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '10px 14px', color: '#16a34a' }}>₺{bayiRows.reduce((s, r) => s + r.paid, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                    <td style={{ padding: '10px 14px', color: '#dc2626' }}>₺{bayiRows.reduce((s, r) => s + Math.max(0, r.total - r.paid), 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Ürün Bazlı */}
        {tab === 'urun' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Ürün Bazlı Özet</span>
              <button onClick={() => downloadCSV(
                [['Ürün', 'Birim', 'Toplam Adet', 'Toplam Tutar (₺, KDV dahil)'],
                 ...urunRows.map(r => [r.name, r.unit, String(r.qty), r.total.toFixed(2)])],
                'urun-raporu.csv'
              )} style={{ padding: '6px 14px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                CSV İndir
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f2ec' }}>
                  {['Ürün', 'Birim', 'Toplam Adet', 'Toplam Tutar (KDV dahil)'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {urunRows.length === 0
                  ? <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                  : urunRows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{r.name}</td>
                        <td style={{ ...tdStyle, color: '#555' }}>{r.unit}</td>
                        <td style={{ ...tdStyle, color: '#555' }}>{r.qty.toLocaleString('tr-TR')}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>₺{r.total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))
                }
                {urunRows.length > 0 && (
                  <tr style={{ background: '#f5f2ec', fontWeight: 700 }}>
                    <td style={{ padding: '10px 14px' }} colSpan={2}>Toplam</td>
                    <td style={{ padding: '10px 14px' }}>{urunRows.reduce((s, r) => s + r.qty, 0).toLocaleString('tr-TR')}</td>
                    <td style={{ padding: '10px 14px' }}>₺{urunRows.reduce((s, r) => s + r.total, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Dönemsel */}
        {tab === 'donemsel' && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>Dönemsel Özet</span>
              <button onClick={() => downloadCSV(
                [['Dönem', 'Sipariş Sayısı', 'Toplam Tutar (₺)'],
                 ...donemselRows.map(r => [r.month, String(r.count), r.total.toFixed(2)])],
                'donemsel-raporu.csv'
              )} style={{ padding: '6px 14px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                CSV İndir
              </button>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f5f2ec' }}>
                  {['Dönem', 'Sipariş Sayısı', 'Toplam Tutar'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {donemselRows.length === 0
                  ? <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Veri yok</td></tr>
                  : donemselRows.map((r, i) => (
                      <tr key={i}>
                        <td style={{ ...tdStyle, fontWeight: 500 }}>{r.month}</td>
                        <td style={{ ...tdStyle, color: '#555' }}>{r.count}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>₺{r.total.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                      </tr>
                    ))
                }
                {donemselRows.length > 0 && (
                  <tr style={{ background: '#f5f2ec', fontWeight: 700 }}>
                    <td style={{ padding: '10px 14px' }}>Toplam</td>
                    <td style={{ padding: '10px 14px' }}>{donemselRows.reduce((s, r) => s + r.count, 0)}</td>
                    <td style={{ padding: '10px 14px' }}>₺{donemselRows.reduce((s, r) => s + r.total, 0).toLocaleString('tr-TR', { maximumFractionDigits: 0 })}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  )
}
