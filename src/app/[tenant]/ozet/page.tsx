'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function OzetPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    orderCount: 0, pendingCount: 0, dealerCount: 0, orderTotal: 0,
    productCount: 0, lowStockCount: 0, crmCount: 0,
  })

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase.from('tenants').select('id, name, modules').eq('slug', slug).single()
    if (!tenantData) { router.push('/'); return }
    setTenant(tenantData)
    const mods: string[] = tenantData.modules || []

    let orderCount = 0, pendingCount = 0, dealerCount = 0, orderTotal = 0
    let productCount = 0, lowStockCount = 0, crmCount = 0

    if (mods.includes('dealer_orders')) {
      const { data: ordersData } = await supabase.from('orders').select('status, total').eq('tenant_id', tenantData.id)
      const os = ordersData || []
      orderCount = os.length
      pendingCount = os.filter((o: any) => o.status === 'PENDING').length
      orderTotal = os.filter((o: any) => o.status !== 'CANCELLED').reduce((s: number, o: any) => s + Number(o.total || 0), 0)

      const { count } = await supabase.from('dealers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantData.id)
      dealerCount = count || 0
    }

    if (mods.includes('stock')) {
      const { data: prodData } = await supabase.from('dealer_products').select('stock_quantity').eq('tenant_id', tenantData.id)
      const ps = prodData || []
      productCount = ps.length
      lowStockCount = ps.filter((p: any) => Number(p.stock_quantity || 0) <= 5).length
    }

    if (mods.includes('crm')) {
      const { count } = await supabase.from('crm_customers').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantData.id)
      crmCount = count || 0
    }

    setStats({ orderCount, pendingCount, dealerCount, orderTotal, productCount, lowStockCount, crmCount })
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  const modules: string[] = tenant?.modules || []
  const cards: { label: string; value: string | number }[] = []

  if (modules.includes('dealer_orders')) {
    cards.push({ label: 'Toplam Sipariş', value: stats.orderCount })
    cards.push({ label: 'Bekleyen Onay', value: stats.pendingCount })
    cards.push({ label: 'Aktif Bayi', value: stats.dealerCount })
    cards.push({ label: 'Toplam Sipariş Tutarı', value: `₺${stats.orderTotal.toLocaleString('tr-TR', { maximumFractionDigits: 0 })}` })
  }
  if (modules.includes('stock')) {
    cards.push({ label: 'Stoklu Ürün', value: stats.productCount })
    cards.push({ label: 'Kritik Stok', value: stats.lowStockCount })
  }
  if (modules.includes('crm')) {
    cards.push({ label: 'CRM Müşteri', value: stats.crmCount })
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginBottom: 4 }}>Özet</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 24 }}>{tenant?.name}</p>

        {cards.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 28, textAlign: 'center', color: '#888', fontSize: 14 }}>
            Henüz aktif modül yok.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
            {cards.map(c => (
              <div key={c.label} style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: '16px 18px' }}>
                <div style={{ fontSize: 11, color: '#888', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{c.label}</div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1 }}>{c.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
