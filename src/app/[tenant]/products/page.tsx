'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import CategoryButton from './CategoryButton'

type Level = { id: string; name: string; sort_order: number }

export default function TenantProductsPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [products, setProducts] = useState<any[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [tenantName, setTenantName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user ?? null
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase
      .from('tenants').select('id, name, owner_id').eq('slug', slug).single()
    if (!tenantData || tenantData.owner_id !== user.id) { router.push('/dashboard'); return }

    setTenantName(tenantData.name)

    const [{ data: prods }, { data: lvls }] = await Promise.all([
      supabase.from('dealer_products').select('*').eq('tenant_id', tenantData.id).order('code'),
      supabase.from('product_category_levels').select('id, name, sort_order').eq('tenant_id', tenantData.id).order('sort_order'),
    ])

    setProducts(prods || [])
    setLevels(lvls || [])
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  const thStyle: React.CSSProperties = {
    padding: '10px 16px', textAlign: 'left', fontSize: 11,
    color: '#888', fontWeight: 500, textTransform: 'uppercase',
    letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)',
    whiteSpace: 'nowrap',
  }
  const tdStyle: React.CSSProperties = { padding: '12px 16px', borderBottom: '1px solid rgba(15,15,15,0.06)' }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link href={`/${slug}/dashboard`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(15,15,15,0.07)', border: 'none', borderRadius: 8, fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 500 }}>← {tenantName}</Link>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginTop: 6 }}>Ürünler</h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <CategoryButton slug={slug} />
            <Link href={`/${slug}/products/new`} style={{ padding: '9px 18px', background: '#0f0f0f', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              + Yeni Ürün
            </Link>
          </div>
        </div>

        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ec' }}>
                <th style={thStyle}>Kod</th>
                <th style={thStyle}>Ürün Adı</th>
                {levels.map(l => <th key={l.id} style={thStyle}>{l.name}</th>)}
                {levels.length === 0 && <th style={thStyle}>Kategori</th>}
                <th style={thStyle}>Birim</th>
                <th style={thStyle}>Fiyat</th>
                <th style={thStyle}>KDV</th>
                <th style={thStyle}>Durum</th>
                <th style={thStyle}></th>
              </tr>
            </thead>
            <tbody>
              {products.length === 0 ? (
                <tr><td colSpan={7 + levels.length} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Henüz ürün yok</td></tr>
              ) : (
                products.map(p => {
                  const catData: Record<string, string> = p.category_data || {}
                  return (
                    <tr key={p.id}>
                      <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{p.code}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{p.name}</td>
                      {levels.length > 0
                        ? levels.map(l => <td key={l.id} style={{ ...tdStyle, color: '#666' }}>{catData[l.id] || '—'}</td>)
                        : <td style={{ ...tdStyle, color: '#666' }}>{p.category || '—'}</td>
                      }
                      <td style={{ ...tdStyle, color: '#666' }}>{p.unit}</td>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>₺{Number(p.base_price).toLocaleString('tr-TR')}</td>
                      <td style={{ ...tdStyle, color: '#666' }}>%{p.vat_rate}</td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 500, background: p.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2', color: p.status === 'ACTIVE' ? '#16a34a' : '#dc2626' }}>
                          {p.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <Link href={`/${slug}/products/${p.id}/edit`} style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none' }}>Düzenle</Link>
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
