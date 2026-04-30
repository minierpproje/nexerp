'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function BranchesPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.tenant as string
  const supabase = createClient()

  const [branches, setBranches] = useState<any[]>([])
  const [dealerId, setDealerId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', contact_person: '', phone: '' })
  const [error, setError] = useState('')

  useEffect(() => { loadData() }, [])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push(`/${slug}/login`); return }

    const { data: tenantData } = await supabase
      .from('tenants').select('id').eq('slug', slug).single()
    if (!tenantData) { router.push(`/${slug}/login`); return }
    setTenantId(tenantData.id)

    const { data: dealerData } = await supabase
      .from('dealers').select('id, status')
      .eq('tenant_id', tenantData.id)
      .eq('email', user.email)
      .single()
    if (!dealerData || dealerData.status !== 'ACTIVE') { router.push(`/${slug}/orders`); return }
    setDealerId(dealerData.id)

    const { data: branchesData } = await supabase
      .from('dealer_branches')
      .select('*')
      .eq('dealer_id', dealerData.id)
      .order('name')
    setBranches(branchesData || [])
    setLoading(false)
  }

  async function saveBranch() {
    if (!form.name.trim()) { setError('Şube adı zorunludur.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('dealer_branches').insert({
      tenant_id: tenantId,
      dealer_id: dealerId,
      name: form.name.trim(),
      address: form.address.trim() || null,
      contact_person: form.contact_person.trim() || null,
      phone: form.phone.trim() || null,
    })
    if (err) { setError('Kayıt sırasında hata oluştu.'); setSaving(false); return }
    setForm({ name: '', address: '', contact_person: '', phone: '' })
    setShowForm(false)
    setSaving(false)
    loadData()
  }

  async function deleteBranch(id: string) {
    if (!confirm('Bu şubeyi silmek istediğinizden emin misiniz?')) return
    await supabase.from('dealer_branches').delete().eq('id', id)
    loadData()
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '40px 32px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>

        <div style={{ marginBottom: 24 }}>
          <button onClick={() => router.push(`/${slug}/orders`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(15,15,15,0.07)', border: 'none', borderRadius: 8, fontSize: 13, color: '#374151', fontWeight: 500, cursor: 'pointer' }}>
            ← Siparişlere Dön
          </button>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#2d7a57', marginBottom: 4 }}>{slug}</div>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 28, letterSpacing: -1 }}>Şubelerim</h1>
          </div>
          <button onClick={() => { setShowForm(!showForm); setError('') }}
            style={{ padding: '9px 18px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
            {showForm ? 'İptal' : '+ Şube Ekle'}
          </button>
        </div>

        {showForm && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 24, marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 18, marginBottom: 16 }}>Yeni Şube</h2>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: '#dc2626' }}>{error}</div>
            )}

            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Şube Adı *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Örn: Merkez Şube, Kadıköy Deposu..."
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Adres</label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Teslimat adresi"
                  rows={2}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>İletişim Kişisi</label>
                  <input value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} placeholder="Ad Soyad"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#888', fontWeight: 500, marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Telefon</label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="05xx xxx xx xx"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
              <button onClick={saveBranch} disabled={saving}
                style={{ padding: '10px 24px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </div>
        )}

        {branches.length === 0 && !showForm ? (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 48, textAlign: 'center' }}>
            <p style={{ color: '#888', fontSize: 14, marginBottom: 16 }}>Henüz şube eklenmemiş.</p>
            <p style={{ color: '#aaa', fontSize: 13 }}>Şube ekleyerek sipariş formunda teslimat adresi olarak seçebilirsiniz.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {branches.map((b: any) => (
              <div key={b.id} style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{b.name}</div>
                  {b.address && <div style={{ fontSize: 13, color: '#555', marginBottom: 2 }}>{b.address}</div>}
                  <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                    {b.contact_person && <span style={{ fontSize: 12, color: '#888' }}>👤 {b.contact_person}</span>}
                    {b.phone && <span style={{ fontSize: 12, color: '#888' }}>📞 {b.phone}</span>}
                  </div>
                </div>
                <button onClick={() => deleteBranch(b.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 18, padding: '0 4px', lineHeight: 1, marginLeft: 12 }} title="Sil">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
