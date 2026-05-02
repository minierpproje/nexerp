'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  const [tenants, setTenants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { session: _authSession } } = await supabase.auth.getSession()
    const user = _authSession?.user ?? null
    if (!user) { router.push('/login'); return }
    const { data: profile } = await supabase.from('profiles').select('is_super_admin').eq('id', user.id).single()
    if (!profile?.is_super_admin) { router.push('/dashboard'); return }
    const { data } = await supabase.from('tenants').select('*, profiles(full_name)').order('created_at', { ascending: false })
    setTenants(data || [])
    setLoading(false)
  }

  async function updateTenant(id: string, updates: any) {
    await fetch('/api/admin/update-tenant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: id, updates }) })
    setTenants(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t))
  }

  async function updateOwnerEmail(id: string, newEmail: string) {
    const res = await fetch('/api/admin/update-owner-email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tenantId: id, newEmail }) })
    const data = await res.json()
    if (data.ok) setTenants(prev => prev.map(t => t.id === id ? { ...t, owner_email: newEmail } : t))
    else alert('E-posta güncellenemedi: ' + data.error)
  }

  if (loading) return <div style={{ padding: 40, color: '#888' }}>Yükleniyor...</div>

  const statusColor: Record<string, { bg: string; color: string }> = {
    trial: { bg: '#fdf3e0', color: '#b87d1a' },
    active: { bg: '#f0fdf4', color: '#16a34a' },
    suspended: { bg: '#fef2f2', color: '#dc2626' },
  }
  const statusLabel: Record<string, string> = {
    trial: 'Deneme',
    active: 'Aktif',
    suspended: 'Askıya Alındı',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div>
            <a href="/dashboard" style={{ fontSize: 12, color: '#888', textDecoration: 'none' }}>← Dashboard</a>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1, marginTop: 6 }}>Müşteriler</h1>
          </div>
          <span style={{ fontSize: 13, color: '#888' }}>{tenants.length} müşteri</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {tenants.map((t: any) => (
            <div key={t.id} style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
                onClick={() => setExpanded(expanded === t.id ? null : t.id)}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: '#888', fontFamily: 'monospace', marginTop: 2 }}>{t.slug}</div>
                </div>
                <div style={{ fontSize: 13, color: '#666' }}>{t.owner_email || t.profiles?.full_name || '—'}</div>
                <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 500, background: statusColor[t.status]?.bg, color: statusColor[t.status]?.color }}>
                  {statusLabel[t.status] || t.status}
                </span>
                <a href={'/' + t.slug + '/dashboard'} onClick={e => e.stopPropagation()}
                  style={{ padding: '5px 12px', background: '#0f0f0f', color: 'white', borderRadius: 6, fontSize: 12, textDecoration: 'none' }}>
                  Panele Git
                </a>
                <span style={{ fontSize: 12, color: '#aaa' }}>{expanded === t.id ? '▲' : '▼'}</span>
              </div>

              {expanded === t.id && (
                <div style={{ borderTop: '1px solid rgba(15,15,15,0.06)', padding: '20px', background: '#fafaf8' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }}>
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>E-posta</div>
                      <input type="email" key={t.id + t.owner_email} defaultValue={t.owner_email || ''} onBlur={e => { if (e.target.value && e.target.value !== t.owner_email) updateOwnerEmail(t.id, e.target.value) }} placeholder="—" style={{ fontSize: 13, border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, padding: '5px 8px', outline: 'none', width: '100%', background: 'white', boxSizing: 'border-box' as const }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Telefon</div>
                      <input type="text" defaultValue={t.phone || ''} onBlur={e => updateTenant(t.id, { phone: e.target.value || null })} placeholder="—"
                        style={{ fontSize: 13, border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, padding: '5px 8px', outline: 'none', width: '100%', background: 'white', boxSizing: 'border-box' as const }} />
                    </div>
                    <div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Moduller</div>
                      <div style={{ display: 'flex', gap: 16 }}>
                        {[{ key: 'dealer_orders', label: 'Bayi Siparis Yonetimi' }, { key: 'aktivite', label: 'Aktivite Yonetimi' }, { key: 'stock', label: 'Stok Yonetimi' }, { key: 'crm', label: 'Müşteri Bilgi Sistemi' }, { key: 'gider', label: 'Gider Takip Yönetimi' }].map(m => (
                          <label key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer' }}>
                            <input type='checkbox' checked={(t.modules || []).includes(m.key)}
                              onChange={e => { const cur = t.modules || []; const next = e.target.checked ? [...cur, m.key] : cur.filter((x: string) => x !== m.key); updateTenant(t.id, { modules: next }) }}
                              style={{ cursor: 'pointer' }} />
                            {m.label}
                          </label>
                        ))}
                      </div>
                    </div>
                      <div style={{ fontSize: 13 }}>{t.module || '—'}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Durum</div>
                      <select value={t.status} onChange={e => updateTenant(t.id, { status: e.target.value })}
                        style={{ fontSize: 13, border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, padding: '5px 8px', outline: 'none', background: 'white', cursor: 'pointer' }}>
                        <option value="trial">Deneme</option>
                        <option value="active">Aktif</option>
                        <option value="suspended">Askıya Alındı</option>
                      </select>
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Deneme Bitiş</div>
                      <input type="date" value={t.trial_ends_at ? t.trial_ends_at.slice(0, 10) : ''} onChange={e => updateTenant(t.id, { trial_ends_at: e.target.value || null })}
                        style={{ fontSize: 13, border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, padding: '5px 8px', outline: 'none', background: 'white' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Kayıt Tarihi</div>
                      <div style={{ fontSize: 13 }}>{new Date(t.created_at).toLocaleDateString('tr-TR')}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#888', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>Notlar</div>
                    <textarea defaultValue={t.notes || ''} onBlur={e => updateTenant(t.id, { notes: e.target.value || null })} placeholder="Not ekle..." rows={2}
                      style={{ fontSize: 13, border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, padding: '8px 10px', outline: 'none', width: '100%', background: 'white', resize: 'vertical', boxSizing: 'border-box' as const }} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
