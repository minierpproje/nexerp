import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function TenantProductsPage({
  params,
}: {
  params: Promise<{ tenant: string }>
}) {
  const { tenant: slug } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/${slug}/login`)

  const { data: tenantData } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!tenantData || tenantData.owner_id !== user.id) redirect('/dashboard')

  const { data: products } = await supabase
    .from('dealer_products')
    .select('*')
    .eq('tenant_id', tenantData.id)
    .order('code')

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <Link href={`/${slug}/dashboard`} style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← {tenantData.name}</Link>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginTop: 6 }}>Ürünler</h1>
          </div>
          <Link href={`/${slug}/products/new`} style={{ padding: '9px 18px', background: '#0f0f0f', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
            + Yeni Ürün
          </Link>
        </div>

        <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f5f2ec' }}>
                {['Kod', 'Ürün Adı', 'Kategori', 'Birim', 'Fiyat', 'KDV', 'Durum'].map(h => (
                  <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid rgba(15,15,15,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!products || products.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#888' }}>Henüz ürün yok</td></tr>
              ) : (
                products.map((p: any) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(15,15,15,0.06)' }}>
                    <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#666' }}>{p.code}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{p.category || '—'}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>{p.unit}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>₺{Number(p.base_price).toLocaleString('tr-TR')}</td>
                    <td style={{ padding: '12px 16px', color: '#666' }}>%{p.vat_rate}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, fontWeight: 500, background: p.status === 'ACTIVE' ? '#f0fdf4' : '#fef2f2', color: p.status === 'ACTIVE' ? '#16a34a' : '#dc2626' }}>
                        {p.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
                      </span>
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