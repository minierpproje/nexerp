'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function StockPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState('')
  const [tenantName, setTenantName] = useState('')
  const [saving, setSaving] = useState<string | null>(null)
  const [editStock, setEditStock] = useState<Record<string, number>>({})  
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const [deductInput, setDeductInput] = useState<Record<string, string>>({})
  const [addInput, setAddInput] = useState<Record<string, string>>({})

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session: _authSession } } = await supabase.auth.getSession()
    const user = _authSession?.user ?? null
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase
      .from('tenants').select('id, name, owner_id').eq('slug', slug).single()
    if (!tenantData) { router.push('/dashboard'); return }

    const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
    const isAdmin = profile?.is_super_admin === true
    if (!isAdmin && tenantData.owner_id !== user.id) { router.push(`/${slug}/login`); return }
    setIsSuperAdmin(isAdmin)

    setTenantId(tenantData.id)
    setTenantName(tenantData.name)

    const { data: productsData } = await supabase
      .from('dealer_products')
      .select('*')
      .eq('tenant_id', tenantData.id)
      .order('code')

    setProducts(productsData || [])
    setLoading(false)
  }

  async function updateStock(productId: string, stock: number) {
    setSaving(productId)
    await supabase.from('dealer_products').update({ stock_quantity: stock }).eq('id', productId)
    setProducts(products.map(p => p.id === productId ? { ...p, stock_quantity: stock } : p))
    setEditStock(prev => { const n = { ...prev }; delete n[productId]; return n })
    setSaving(null)
  }

  async function addStock(productId: string, qty: number, currentQty: number) {
    if (qty <= 0) return
    const newQty = currentQty + qty
    setSaving(productId)
    await supabase.from('dealer_products').update({ stock_quantity: newQty }).eq('id', productId)
    setProducts(products.map(p => p.id === productId ? { ...p, stock_quantity: newQty } : p))
    setAddInput(prev => { const n = { ...prev }; delete n[productId]; return n })
    setSaving(null)
  }

  async function deductStock(productId: string, qty: number, currentQty: number) {
    if (qty <= 0) return
    const newQty = Math.max(0, currentQty - qty)
    setSaving(productId)
    await supabase.from('dealer_products').update({ stock_quantity: newQty }).eq('id', productId)
    setProducts(products.map(p => p.id === productId ? { ...p, stock_quantity: newQty } : p))
    setDeductInput(prev => { const n = { ...prev }; delete n[productId]; return n })
    setSaving(null)
  }

  const inputStyle = {
    width: 80, padding: '5px 8px',
    border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6,
    fontSize: 13, outline: 'none', textAlign: 'center' as const,
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link href={`/${slug}?select=1`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "rgba(15,15,15,0.07)", borderRadius: 8, fontSize: 13, color: "#374151", textDecoration: "none", fontWeight: 500 }}>← {tenantName}</Link>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginTop: 6 }}>Stok Yönetimi</h1>
            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{products.length} ürün</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/${slug}/products/new`} style={{ padding: '7px 14px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, textDecoration: 'none', fontWeight: 500 }}>+ Ürün Ekle</Link>
            <Link href={`/${slug}/settings`} style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#666' }}>Ayarlar</Link>
            <button onClick={async () => { await supabase.auth.signOut(); router.push(isSuperAdmin ? '/login' : `/${slug}/login`) }}
              style={{ padding: '7px 14px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#666' }}>Çıkış</button>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ec' }}>
                {['Kod', 'Ürün Adı', 'Birim Fiyat', 'Mevcut Stok', 'Stok Ekle', 'Stok Düş', 'Güncelle', ''].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#888' }}>
                  Henüz ürün yok — önce <Link href={`/${slug}/products/new`} style={{ color: '#2d7a57' }}>ürün ekle</Link>
                </td></tr>
              ) : (
                products.map((p: any) => {
                  const currentEdit = editStock[p.id]
                  const stockQty = p.stock_quantity ?? 0
                  const isLow = stockQty <= 5
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid rgba(15,15,15,0.06)' }}>
                      <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{p.code}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.name}</td>
                      <td style={{ padding: '12px 16px', color: '#666' }}>₺{Number(p.base_price).toLocaleString('tr-TR')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: 600, color: isLow ? '#dc2626' : '#16a34a', fontSize: 14 }}>
                          {stockQty}
                        </span>
                        {isLow && <span style={{ fontSize: 11, color: '#dc2626', marginLeft: 6 }}>Düşük</span>}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="number"
                          min={1}
                          value={addInput[p.id] || ''}
                          placeholder="0"
                          onChange={e => setAddInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const qty = parseInt(addInput[p.id] || '0')
                              if (qty > 0) addStock(p.id, qty, stockQty)
                            }
                          }}
                          style={{ ...inputStyle, width: 70, borderColor: addInput[p.id] ? '#16a34a' : 'rgba(15,15,15,0.15)' }}
                          disabled={saving === p.id}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <input
                          type="number"
                          min={1}
                          value={deductInput[p.id] || ''}
                          placeholder="0"
                          onChange={e => setDeductInput(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const qty = parseInt(deductInput[p.id] || '0')
                              if (qty > 0) deductStock(p.id, qty, stockQty)
                            }
                          }}
                          style={{ ...inputStyle, width: 70, borderColor: deductInput[p.id] ? '#dc2626' : 'rgba(15,15,15,0.15)' }}
                          disabled={saving === p.id}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="number"
                            min={0}
                            value={currentEdit !== undefined ? currentEdit : stockQty}
                            onChange={e => setEditStock(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                            style={inputStyle}
                          />
                          {currentEdit !== undefined && currentEdit !== stockQty && (
                            <button
                              onClick={() => updateStock(p.id, currentEdit)}
                              disabled={saving === p.id}
                              style={{ padding: '5px 12px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', opacity: saving === p.id ? 0.6 : 1 }}>
                              {saving === p.id ? '...' : 'Kaydet'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <Link href={`/${slug}/products/${p.id}/edit`} style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>Düzenle</Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}
