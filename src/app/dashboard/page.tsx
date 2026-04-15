import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function PlatformDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const { data: tenants } = await supabase
    .from('tenants')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const moduleLabels: Record<string, string> = {
    dealer_orders: 'Bayi Sipariş',
    activity: 'Aktivite',
    inventory: 'Stok',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 }}>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2d7a57', marginBottom: 6 }}>NexERP Platform</div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 32, letterSpacing: -1 }}>
              Hoş geldin, {profile?.full_name?.split(' ')[0] || 'kullanıcı'}.
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Link href="/new-tenant" style={{ padding: '9px 18px', background: '#0f0f0f', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
              + Yeni Tenant
            </Link>
            <form action="/auth/signout" method="post">
              <button style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Çıkış
              </button>
            </form>
          </div>
        </div>

        {!tenants || tenants.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 14, padding: 48, textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 22, marginBottom: 10 }}>Henüz tenant yok</div>
            <p style={{ fontSize: 14, color: '#888', marginBottom: 24 }}>İlk tenantını oluştur ve modülünü kur.</p>
            <Link href="/new-tenant" style={{ padding: '10px 24px', background: '#0f0f0f', color: 'white', borderRadius: 8, fontSize: 14, fontWeight: 500, textDecoration: 'none' }}>
              Tenant Oluştur →
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 16 }}>
            {tenants.map((t: any) => (
              <div key={t.id} style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 14, padding: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: 16, marginBottom: 4 }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: '#888', fontFamily: 'monospace' }}>nexerp.com/{t.slug}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a', fontWeight: 500 }}>
                      {moduleLabels[t.module] || t.module}
                    </span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: t.status === 'active' ? '#f0fdf4' : '#fdf3e0', color: t.status === 'active' ? '#16a34a' : '#b87d1a', fontWeight: 500 }}>
                      {t.status === 'trial' ? 'Deneme' : 'Aktif'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <Link href={`/${t.slug}/dashboard`} style={{ padding: '8px 16px', background: '#0f0f0f', color: 'white', borderRadius: 8, fontSize: 13, fontWeight: 500, textDecoration: 'none' }}>
                    Panele Git →
                  </Link>
                  <Link href={`/${t.slug}`} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f' }}>
                    Müşteri Görünümü
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}