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

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase
      .from('tenants').select('*').eq('slug', slug).single()
    if (!tenantData) { router.push('/dashboard'); return }
    if (tenantData.owner_id !== user.id) { router.push(`/${slug}/login`); return }
    setTenant(tenantData)

    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, dealers(name)')
      .eq('tenant_id', tenantData.id)
      .order('created_at', { ascending: false })
    setOrders(ordersData || [])

    const { data: dealersData } = await supabase
      .from('dealers').select('id').eq('tenant_id', tenantData.id)
    setDealers(dealersData || [])

    setLoading(false)
  }

  async function updateStatus(orderId: string, status: string) {
    setUpdatingId(orderId)
    await supabase.from('orders').update({ status }).eq('id', orderId)
    setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
    setUpdatingId('')
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
      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link href="/dashboard" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← Platform</Link>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginTop: 6 }}>{tenant?.name}</h1>
            <div style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginTop: 2 }}>nexerp.com/{slug}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href={`/${slug}/dealers`} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f' }}>Bayiler</Link>
            <Link href={`/${slug}/products`} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f' }}>Ürünler</Link>
            <form action="/auth/signout" method="post" style={{ display: 'inline' }}>
              <button style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Çıkış</button>
            </form>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
          {[
            { label: 'Toplam Sipariş', value: orders.length },
            { label: 'Bekleyen Onay', value: orders.filter(o => o.status === 'PENDING').length },
            { label: 'Aktif Bayi', value: dealers.length },
          ].map(card => (
            <div key={card.label} style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1 }}>{card.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(15,15,15,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Siparişler</span>
            <span style={{ fontSize: 12, color: '#888' }}>{orders.length} sipariş</span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ec' }}>
                {['Sipariş No', 'Bayi', 'Tarih', 'Tutar', 'Durum', 'İşlem'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Henüz sipariş yok</td></tr>
              ) : (
                orders.map((o: any) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid rgba(15,15,15,0.06)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{o.order_no}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{o.dealers?.name || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{new Date(o.created_at).toLocaleDateString('tr-TR')}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>₺{Number(o.total).toLocaleString('tr-TR')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 500, background: statusColor[o.status]?.bg, color: statusColor[o.status]?.color }}>
                        {statusLabel[o.status] || o.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <select
                        value={o.status}
                        disabled={updatingId === o.id}
                        onChange={e => updateStatus(o.id, e.target.value)}
                        style={{ padding: '5px 8px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, fontSize: 12, outline: 'none', cursor: 'pointer', background: 'white', opacity: updatingId === o.id ? 0.5 : 1 }}
                      >
                        {Object.entries(statusLabel).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
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