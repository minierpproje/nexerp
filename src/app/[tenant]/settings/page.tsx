'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function TenantSettingsPage() {
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()
  const router = useRouter()

  const [notificationEmail, setNotificationEmail] = useState('')
  const [stockIntegrated, setStockIntegrated] = useState(false)
  const [hideBasePrice, setHideBasePrice] = useState(false)
  const [modules, setModules] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [tenantId, setTenantId] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenant } = await supabase
      .from('tenants').select('id, owner_id, owner_email, notification_email, stock_integrated, hide_base_price, modules').eq('slug', slug).single()

    if (!tenant || tenant.owner_id !== user.id) { router.push(`/${slug}/login`); return }

    setTenantId(tenant.id)
    setNotificationEmail(tenant.notification_email || tenant.owner_email || user.email || '')
    setStockIntegrated(tenant.stock_integrated || false)
    setHideBasePrice(tenant.hide_base_price || false)
    setModules(tenant.modules || [])
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSuccess(false)
    await supabase.from('tenants').update({
      notification_email: notificationEmail,
      stock_integrated: stockIntegrated,
      hide_base_price: hideBasePrice,
    }).eq('id', tenantId)
    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const inputStyle = {
    width: '100%', padding: '10px 12px',
    border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8,
    fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  const hasDealerOrders = modules.includes('dealer_orders')

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto' }}>
        <Link href={`/${slug}?select=1`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(15,15,15,0.07)', borderRadius: 8, fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 500 }}>← Panel</Link>
        <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginTop: 8, marginBottom: 4 }}>Ayarlar</h1>
        <p style={{ fontSize: 13, color: '#888', marginBottom: 28 }}>Firma bildirim ve modül ayarları.</p>

        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 28 }}>
          <form onSubmit={handleSave}>

            {/* Bildirim e-postası */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Bildirim E-postası
              </label>
              <input type="email" value={notificationEmail} onChange={e => setNotificationEmail(e.target.value)}
                placeholder="siparis@firmaniz.com" style={inputStyle} />
              <p style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>
                Yeni bayi kaydolduğunda bu adrese bildirim gönderilir.
              </p>
            </div>

            {/* Stok entegrasyonu */}
            {modules.includes('stock') && hasDealerOrders && (
              <div style={{ marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid rgba(15,15,15,0.07)' }}>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Stok Entegrasyonu
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14 }}>
                  <input type="checkbox" checked={stockIntegrated} onChange={e => setStockIntegrated(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#2d7a57' }} />
                  Sipariş onaylanınca stok otomatik düşsün
                </label>
                <p style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>
                  Aktif olursa sipariş ONAYLANDI durumuna geçince ürün stokları azalır.
                </p>
              </div>
            )}

            {/* Bayi fiyat görünümü */}
            {hasDealerOrders && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Bayi Sipariş — Fiyat Görünümü
                </label>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={hideBasePrice} onChange={e => setHideBasePrice(e.target.checked)}
                    style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#2d7a57', marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 14 }}>Bayiler sadece özel fiyatlarını görsün</div>
                    <p style={{ fontSize: 12, color: '#aaa', marginTop: 4, lineHeight: 1.5 }}>
                      Aktif olursa bayiler sipariş formunda standart liste fiyatını görmez.
                      Kendisi için özel fiyat tanımlıysa yalnızca o fiyatı görür;
                      özel fiyat tanımlı değilse o ürünün standart fiyatını görmeye devam eder.
                    </p>
                  </div>
                </label>
              </div>
            )}

            {success && (
              <div style={{ background: '#f0fdf4', color: '#16a34a', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
                Kaydedildi.
              </div>
            )}

            <button type="submit" disabled={saving}
              style={{ padding: '10px 24px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
