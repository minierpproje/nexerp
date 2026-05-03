'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

const MODULE_META: Record<string, { label: string; desc: string; href: string; icon: string; bg: string }> = {
  dealer_orders: {
    label: 'Bayi Sipariş Yönetimi',
    desc: 'Siparişleri yönet, bayileri takip et, ürün kataloğunu düzenle.',
    href: 'dashboard',
    icon: '🏪',
    bg: '#e8f0ec',
  },
  aktivite: {
    label: 'Aktivite Yönetimi',
    desc: 'Saha aktivitelerini kaydet, firma bazlı takip et ve raporla.',
    href: 'aktivite',
    icon: '📋',
    bg: '#fef3e2',
  },
  stock: {
    label: 'Stok Yönetimi',
    desc: 'Ürün stok miktarlarını görüntüle ve güncelle.',
    href: 'stock',
    icon: '📦',
    bg: '#e8f0fb',
  },
  crm: {
    label: 'Müşteri Bilgi Sistemi',
    desc: 'Müşteri listesini yönet, iletişim bilgilerini takip et.',
    href: 'crm',
    icon: '👥',
    bg: '#f3e8ff',
  },
  gider: {
    label: 'Gider Takip Yönetimi',
    desc: 'İşletme giderlerinizi kategorize edin, aylık bazda grafik ve tablo ile analiz edin.',
    href: 'gider',
    icon: '💸',
    bg: '#fff0e8',
  },
}

const ALL_MODULES = [
  { id: 'dealer_orders', name: 'Bayi Sipariş Yönetimi', icon: '🏪', desc: 'Siparişleri yönet, bayileri takip et.', bg: '#e8f0ec' },
  { id: 'stock', name: 'Stok Yönetimi', icon: '📦', desc: 'Ürün stok miktarlarını görüntüle ve güncelle.', bg: '#e8f0fb' },
  { id: 'crm', name: 'Müşteri Bilgileri Yönetimi', icon: '👥', desc: 'Müşteri listesini yönet, iletişim bilgilerini takip et.', bg: '#f3e8ff' },
  { id: 'gider', name: 'Gider Takip Yönetimi', icon: '💸', desc: 'Giderleri kategorize et, grafik ve tablo ile analiz et.', bg: '#fff0e8' },
  { id: 'aktivite', name: 'Aktivite Yönetimi', icon: '📋', desc: 'Saha aktivitelerini kaydet, firma bazlı takip et.', bg: '#fef3e2' },
]

function TenantHubInner() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.tenant as string
  const supabase = createClient()
  const forceSelect = searchParams.get('select') === '1'

  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [showModuleModal, setShowModuleModal] = useState(false)
  const [addingModule, setAddingModule] = useState<string | null>(null)
  const [modules, setModules] = useState<string[]>([])

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session: _authSession } } = await supabase.auth.getSession()
    const user = _authSession?.user ?? null
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase
      .from('tenants').select('id, name, owner_id, modules').eq('slug', slug).single()
    if (!tenantData) { router.push('/login'); return }

    const owner = tenantData.owner_id === user.id
    if (!owner) {
      const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
      if (!profile?.is_super_admin) { router.push(`/${slug}/login`); return }
    }

    setIsOwner(owner)
    const mods: string[] = tenantData.modules || []
    setModules(mods)

    setTenant(tenantData)
    setLoading(false)
  }

  function goToModule(key: string) {
    const meta = MODULE_META[key]
    if (meta) router.push(`/${slug}/${meta.href}`)
  }

  async function handleAddModule(moduleId: string) {
    setAddingModule(moduleId)
    const res = await fetch('/api/add-module', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId: tenant.id, module: moduleId }),
    })
    const result = await res.json()
    if (result.ok) {
      setModules(result.modules)
      setTenant((t: any) => ({ ...t, modules: result.modules }))
      setShowModuleModal(false)
    }
    setAddingModule(null)
  }


  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  const hasAllModules = ALL_MODULES.every(m => modules.includes(m.id))

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
          <div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 30, letterSpacing: -1, margin: 0 }}>{tenant?.name}</h1>
            <p style={{ fontSize: 13, color: '#888', marginTop: 6 }}>Çalışmak istediğiniz modülü seçin.</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {modules.length === 0 && (
            <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 28, textAlign: 'center', color: '#888', fontSize: 14 }}>
              Henüz aktif modül yok. Lütfen yöneticinizle iletişime geçin.
            </div>
          )}
          {modules.map(key => {
            const meta = MODULE_META[key]
            if (!meta) return null
            return (
              <button key={key} onClick={() => goToModule(key)}
                style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: '22px 26px', textAlign: 'left', cursor: 'pointer', transition: 'all 0.15s', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2d7a57'; e.currentTarget.style.background = meta.bg }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(15,15,15,0.1)'; e.currentTarget.style.background = 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{meta.icon}</div>
                  <div>
                    <div style={{ fontFamily: 'Georgia, serif', fontSize: 17, fontWeight: 500, marginBottom: 4 }}>{meta.label}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{meta.desc}</div>
                  </div>
                </div>
                <span style={{ fontSize: 18, color: '#ccc', marginLeft: 16 }}>→</span>
              </button>
            )
          })}
        </div>

        <div style={{ marginTop: 20, display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center' }}>
          <a href={`/${slug}/settings`} style={{ fontSize: 12, color: '#aaa', textDecoration: 'none' }}>Ayarlar</a>
          {isOwner && !hasAllModules && (
            <button onClick={() => setShowModuleModal(true)}
              style={{ padding: '6px 14px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
              + Modül Ekle
            </button>
          )}
        </div>

      </div>

      {/* Modül Ekle Modal */}
      {showModuleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModuleModal(false) }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: '100%', maxWidth: 420 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 20 }}>Modül Ekle</div>
              <button onClick={() => setShowModuleModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>
              Seçtiğiniz modül hesabınıza hemen eklenir. Ücretlendirme yakında aktif olacak.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {ALL_MODULES.filter(m => !modules.includes(m.id)).map(m => (
                <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderRadius: 10, border: '1px solid rgba(15,15,15,0.1)', background: m.bg }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 22 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{m.name}</div>
                      <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{m.desc}</div>
                    </div>
                  </div>
                  <button onClick={() => handleAddModule(m.id)} disabled={addingModule === m.id}
                    style={{ marginLeft: 12, padding: '7px 16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 500, cursor: addingModule === m.id ? 'not-allowed' : 'pointer', opacity: addingModule === m.id ? 0.6 : 1, whiteSpace: 'nowrap' }}>
                    {addingModule === m.id ? '...' : 'Ekle'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TenantHubPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
        <p style={{ color: '#888' }}>Yükleniyor...</p>
      </div>
    }>
      <TenantHubInner />
    </Suspense>
  )
}
