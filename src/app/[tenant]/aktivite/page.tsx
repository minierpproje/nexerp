'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

const sb = createClient()

type Tab = 'giris' | 'aktiviteler' | 'fatura' | 'odeme' | 'rate' | 'masterdata'
type Firm = { id: string; name: string }
type Log = { id: string; date: string; firm_id: string; modul: string; birim: string; adet: number; tanim: string }
type Rate = { id: string; firm_id: string; yil: number; gunluk_rate: number }
type Takip = { id: string; firm_id: string; tip: string; yil: number; ay: number; durum: string }

const AYLAR = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara']
const BIRIMLER = ['Saat','Gün','Adet']

export default function AktivitePage() {
  const params = useParams()
  const tenant = params.tenant as string
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('giris')
  const [tenantId, setTenantId] = useState('')
  const [isOwner, setIsOwner] = useState(false)
  const [firms, setFirms] = useState<Firm[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [rates, setRates] = useState<Rate[]>([])
  const [takip, setTakip] = useState<Takip[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // Filters
  const [fStart, setFStart] = useState('')
  const [fEnd, setFEnd] = useState('')
  const [fFirm, setFFirm] = useState('')
  const [fModul, setFModul] = useState('')

  // New log form
  const [nDate, setNDate] = useState(new Date().toISOString().slice(0,10))
  const [nFirm, setNFirm] = useState('')
  const [nModul, setNModul] = useState('FI')
  const [nBirim, setNBirim] = useState('Saat')
  const [nAdet, setNAdet] = useState('')
  const [nTanim, setNTanim] = useState('')
  const [saving, setSaving] = useState(false)

  // Bulk form
  const [bStart, setBStart] = useState('')
  const [bEnd, setBEnd] = useState('')
  const [bFirm, setBFirm] = useState('')
  const [bModul, setBModul] = useState('FI')
  const [bBirim, setBBirim] = useState('Saat')
  const [bAdet, setBAdet] = useState('')
  const [bTanim, setBTanim] = useState('')
  const [showBulk, setShowBulk] = useState(false)

  // Edit
  const [editLog, setEditLog] = useState<Log | null>(null)

  // Master data
  const [newFirma, setNewFirma] = useState('')
  const [rateFirm, setRateFirm] = useState('')
  const [rateYil, setRateYil] = useState(new Date().getFullYear())
  const [rateVal, setRateVal] = useState('')

  // Takip year
  const [takipYil, setTakipYil] = useState(new Date().getFullYear())

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadData = useCallback(async () => {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { router.push(`/${tenant}/login`); return }

    const { data: tData } = await sb.from('tenants').select('id,owner_id,modules').eq('slug', tenant).single()
    if (!tData) { router.push('/'); return }
    if (!tData.modules?.includes('aktivite')) { router.push(`/${tenant}`); return }

    setTenantId(tData.id)
    setIsOwner(tData.owner_id === session.user.id)

    const [{ data: fData }, { data: rData }] = await Promise.all([
      sb.from('activity_firms').select('*').eq('tenant_id', tData.id).order('name'),
      sb.from('activity_rates').select('*').eq('tenant_id', tData.id),
    ])
    setFirms(fData || [])
    setRates(rData || [])
    if (fData && fData.length > 0) {
      setNFirm(fData[0].id)
      setBFirm(fData[0].id)
    }
    setLoading(false)
  }, [tenant, router])

  useEffect(() => { loadData() }, [loadData])

  async function loadLogs() {
    if (!tenantId) return
    let q = sb.from('activity_logs').select('*').eq('tenant_id', tenantId).order('date', { ascending: false })
    if (fStart) q = q.gte('date', fStart)
    if (fEnd) q = q.lte('date', fEnd)
    if (fFirm) q = q.eq('firm_id', fFirm)
    if (fModul) q = q.ilike('modul', `%${fModul}%`)
    const { data } = await q
    setLogs(data || [])
  }

  async function loadTakip() {
    if (!tenantId) return
    const { data } = await sb.from('activity_takip').select('*').eq('tenant_id', tenantId).eq('yil', takipYil)
    setTakip(data || [])
  }

  useEffect(() => { if (tab === 'aktiviteler') loadLogs() }, [tab, tenantId, fStart, fEnd, fFirm, fModul])
  useEffect(() => { if (tab === 'fatura' || tab === 'odeme') loadTakip() }, [tab, tenantId, takipYil])

  async function saveLog() {
    if (!nFirm || !nAdet) { showToast('Firma ve adet zorunlu'); return }
    setSaving(true)
    const { error } = await sb.from('activity_logs').insert({
      tenant_id: tenantId, firm_id: nFirm, date: nDate,
      modul: nModul || 'FI', birim: nBirim, adet: parseFloat(nAdet) || 0, tanim: nTanim
    })
    setSaving(false)
    if (error) { showToast('Hata: ' + error.message); return }
    showToast('Kayıt eklendi.')
    setNAdet(''); setNTanim(''); setNDate(new Date().toISOString().slice(0,10))
  }

  async function saveBulk() {
    if (!bFirm || !bAdet || !bStart || !bEnd) { showToast('Tüm alanları doldurun'); return }
    const rows: any[] = []
    const cur = new Date(bStart + 'T00:00:00')
    const end = new Date(bEnd + 'T00:00:00')
    while (cur <= end) {
      const d = cur.toISOString().slice(0, 10)
      rows.push({ tenant_id: tenantId, firm_id: bFirm, date: d, modul: bModul || 'FI', birim: bBirim, adet: parseFloat(bAdet) || 0, tanim: bTanim })
      cur.setDate(cur.getDate() + 1)
    }
    setSaving(true)
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await sb.from('activity_logs').insert(rows.slice(i, i + 100))
      if (error) { setSaving(false); showToast('Hata: ' + error.message); return }
    }
    setSaving(false)
    showToast(`${rows.length} kayıt eklendi.`)
    setShowBulk(false)
    if (tab === 'aktiviteler') loadLogs()
  }

  async function updateLog() {
    if (!editLog) return
    setSaving(true)
    const { error } = await sb.from('activity_logs').update({
      date: editLog.date, firm_id: editLog.firm_id, modul: editLog.modul,
      birim: editLog.birim, adet: editLog.adet, tanim: editLog.tanim
    }).eq('id', editLog.id)
    setSaving(false)
    if (error) { showToast('Hata: ' + error.message); return }
    showToast('Güncellendi.')
    setEditLog(null)
    loadLogs()
  }

  async function deleteLog(id: string) {
    if (!confirm('Kayıt silinsin mi?')) return
    await sb.from('activity_logs').delete().eq('id', id)
    showToast('Silindi.')
    loadLogs()
  }

  async function addFirma() {
    if (!newFirma.trim()) return
    const { error } = await sb.from('activity_firms').insert({ tenant_id: tenantId, name: newFirma.trim() })
    if (error) { showToast('Hata: ' + error.message); return }
    showToast('Firma eklendi.')
    setNewFirma('')
    loadData()
  }

  async function deleteFirma(id: string) {
    if (!confirm('Firma silinsin mi?')) return
    await sb.from('activity_firms').delete().eq('id', id)
    showToast('Silindi.')
    loadData()
  }

  async function saveRate() {
    if (!rateFirm || !rateVal) return
    const existing = rates.find(r => r.firm_id === rateFirm && r.yil === rateYil)
    if (existing) {
      await sb.from('activity_rates').update({ gunluk_rate: parseFloat(rateVal) }).eq('id', existing.id)
    } else {
      await sb.from('activity_rates').insert({ tenant_id: tenantId, firm_id: rateFirm, yil: rateYil, gunluk_rate: parseFloat(rateVal) })
    }
    showToast('Rate kaydedildi.')
    setRateVal('')
    const { data } = await sb.from('activity_rates').select('*').eq('tenant_id', tenantId)
    setRates(data || [])
  }

  async function toggleTakip(firmId: string, tip: string, ay: number) {
    const existing = takip.find(t => t.firm_id === firmId && t.tip === tip && t.yil === takipYil && t.ay === ay)
    const durumlar = ['bekliyor', 'tamam', 'sorun']
    if (existing) {
      const next = durumlar[(durumlar.indexOf(existing.durum) + 1) % durumlar.length]
      await sb.from('activity_takip').update({ durum: next }).eq('id', existing.id)
    } else {
      await sb.from('activity_takip').insert({ tenant_id: tenantId, firm_id: firmId, tip, yil: takipYil, ay, durum: 'tamam' })
    }
    loadTakip()
  }

  function getTakipCell(firmId: string, tip: string, ay: number) {
    const t = takip.find(t => t.firm_id === firmId && t.tip === tip && t.yil === takipYil && t.ay === ay)
    if (!t || t.durum === 'bekliyor') return { label: '—', bg: 'transparent', color: '#aaa' }
    if (t.durum === 'tamam') return { label: '✓', bg: '#EAF3DE', color: '#3B6D11' }
    return { label: '!', bg: '#FCEBEB', color: '#A32D2D' }
  }

  function firmName(id: string) { return firms.find(f => f.id === id)?.name || '—' }

  function exportExcel() {
    const rows = [['Tarih', 'Firma', 'Modül', 'Adet', 'Birim', 'Tanım'],
      ...logs.map(l => [l.date, firmName(l.firm_id), l.modul, l.adet, l.birim, l.tanim])]
    const ws = (window as any).XLSX?.utils?.aoa_to_sheet(rows)
    if (!ws) { showToast('Excel kütüphanesi yüklenemedi'); return }
    const wb = (window as any).XLSX.utils.book_new()
    ;(window as any).XLSX.utils.book_append_sheet(wb, ws, 'Aktiviteler')
    ;(window as any).XLSX.writeFile(wb, 'aktiviteler.xlsx')
  }

  // Rate summary
  const rateSummary = (() => {
    const groups: Record<string, { firm: string; ay: number; saat: number; gun: number }[]> = {}
    logs.forEach(l => {
      const key = `${l.firm_id}-${l.date.slice(0,7)}`
      if (!groups[key]) groups[key] = []
      groups[key].push({ firm: l.firm_id, ay: parseInt(l.date.slice(5,7)), saat: l.birim === 'Saat' ? l.adet : 0, gun: l.birim === 'Gün' ? l.adet : 0 })
    })
    return Object.entries(groups).map(([key, items]) => {
      const firmId = items[0].firm; const ay = items[0].ay; const yil = parseInt(key.split('-')[1] || '0')
      const saat = items.reduce((s, i) => s + i.saat, 0)
      const gun = items.reduce((s, i) => s + i.gun, 0)
      const rate = rates.find(r => r.firm_id === firmId && r.yil === yil)?.gunluk_rate || 0
      const tutar = gun * rate + saat * (rate / 8)
      return { firmId, ay, yil: parseInt(key.split('-')[1] || '0'), saat, gun, rate, tutar }
    }).sort((a, b) => firmName(a.firmId).localeCompare(firmName(b.firmId)))
  })()

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'sans-serif' }}>Yükleniyor...</div>

  const inp: React.CSSProperties = { padding: '7px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, fontFamily: 'sans-serif', outline: 'none', background: '#fff' }
  const btn = (variant: 'primary' | 'default' | 'danger' | 'success' = 'default'): React.CSSProperties => ({
    padding: '7px 14px', border: '1px solid', borderRadius: 6, fontSize: 13, cursor: 'pointer', fontWeight: 500,
    ...(variant === 'primary' ? { background: '#0f0f0f', color: '#fff', borderColor: '#0f0f0f' } :
      variant === 'danger' ? { background: '#E24B4A', color: '#fff', borderColor: '#E24B4A' } :
      variant === 'success' ? { background: '#1D9E75', color: '#fff', borderColor: '#1D9E75' } :
      { background: '#fff', color: '#0f0f0f', borderColor: '#ddd' })
  })

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#f5f5f3', minHeight: '100vh' }}>
      {/* Topbar */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
        <Link href={`/${tenant}?select=1`} style={{ fontSize: 15, fontWeight: 500, padding: '14px 0', marginRight: 16, textDecoration: 'none', color: '#0f0f0f', whiteSpace: 'nowrap' }}>
          ← Simple<span style={{ color: '#2d7a57' }}>OR</span>der
        </Link>
        <span style={{ color: '#ddd', marginRight: 16 }}>|</span>
        <span style={{ fontSize: 14, fontWeight: 500, padding: '14px 0', marginRight: 16, color: '#0f0f0f', whiteSpace: 'nowrap' }}>Aktivite</span>
        {(['giris', 'aktiviteler', ...(isOwner ? ['fatura', 'odeme', 'rate', 'masterdata'] : [])] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '14px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            color: tab === t ? '#0f0f0f' : '#888', borderBottom: tab === t ? '2px solid #0f0f0f' : '2px solid transparent',
            background: 'none', border: 'none',
            whiteSpace: 'nowrap', marginBottom: -1
          }}>
            {t === 'giris' ? 'Giriş' : t === 'aktiviteler' ? 'Aktiviteler' : t === 'fatura' ? 'Fatura Takip' : t === 'odeme' ? 'Ödeme Takip' : t === 'rate' ? 'Rate Özeti' : 'Master Data'}
          </button>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 16px' }}>

        {/* GİRİŞ TAB */}
        {tab === 'giris' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <button style={btn('primary')} onClick={() => setTab('aktiviteler')}>+ Yeni Aktivite</button>
              <button style={btn()} onClick={() => setShowBulk(true)}>Toplu Aktivite</button>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: '20px', marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>Aktivite girmek için <strong>Aktiviteler</strong> sekmesini veya <strong>Toplu Aktivite</strong> butonunu kullanın.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10 }}>
                {[
                  { v: firms.length, l: 'Firma' },
                  { v: logs.length || '—', l: 'Aktivite (filtreli)' },
                ].map(s => (
                  <div key={s.l} style={{ background: '#f5f5f3', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ fontSize: 24, fontWeight: 500 }}>{s.v}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick add form */}
            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: '20px' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 16 }}>Hızlı Aktivite Ekle</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 12, marginBottom: 12 }}>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>TARİH</label>
                  <input type="date" value={nDate} onChange={e => setNDate(e.target.value)} style={{ ...inp, width: '100%' }} /></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>FİRMA</label>
                  <select value={nFirm} onChange={e => setNFirm(e.target.value)} style={{ ...inp, width: '100%' }}>
                    {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>MODÜL</label>
                  <input value={nModul} onChange={e => setNModul(e.target.value)} style={{ ...inp, width: '100%' }} placeholder="FI" /></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>ADET</label>
                  <input type="number" value={nAdet} onChange={e => setNAdet(e.target.value)} style={{ ...inp, width: '100%' }} placeholder="0" /></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>BİRİM</label>
                  <select value={nBirim} onChange={e => setNBirim(e.target.value)} style={{ ...inp, width: '100%' }}>
                    {BIRIMLER.map(b => <option key={b}>{b}</option>)}
                  </select></div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>TANIM</label>
                <textarea value={nTanim} onChange={e => setNTanim(e.target.value)} style={{ ...inp, width: '100%', minHeight: 80, resize: 'vertical' }} placeholder="Aktivite açıklaması..." />
              </div>
              <button style={btn('success')} onClick={saveLog} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </div>
        )}

        {/* AKTİVİTELER TAB */}
        {tab === 'aktiviteler' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>BAŞLANGIÇ</label>
                <input type="date" value={fStart} onChange={e => setFStart(e.target.value)} style={inp} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>BİTİŞ</label>
                <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} style={inp} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>FİRMA</label>
                <select value={fFirm} onChange={e => setFFirm(e.target.value)} style={inp}>
                  <option value="">Tümü</option>
                  {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>MODÜL</label>
                <input value={fModul} onChange={e => setFModul(e.target.value)} style={{ ...inp, width: 80 }} placeholder="FI" /></div>
              <button style={btn('primary')} onClick={loadLogs}>Filtrele</button>
              <button style={btn()} onClick={exportExcel}>Excel İndir</button>
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
              {logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: 13 }}>Kayıt bulunamadı</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead><tr style={{ background: '#f5f5f3' }}>
                      {['Tarih', 'Firma', 'Modül', 'Adet', 'Birim', 'Tanım', ''].map(h => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid #e5e5e5' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {logs.map(l => (
                        <tr key={l.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                          <td style={{ padding: '8px 12px' }}>{l.date}</td>
                          <td style={{ padding: '8px 12px' }}>{firmName(l.firm_id)}</td>
                          <td style={{ padding: '8px 12px' }}>{l.modul}</td>
                          <td style={{ padding: '8px 12px' }}>{l.adet}</td>
                          <td style={{ padding: '8px 12px' }}>{l.birim}</td>
                          <td style={{ padding: '8px 12px', maxWidth: 260, color: '#555' }}>{l.tanim}</td>
                          <td style={{ padding: '8px 12px' }}>
                            <button style={{ ...btn(), padding: '3px 8px', fontSize: 11, marginRight: 4 }} onClick={() => setEditLog(l)}>Düzenle</button>
                            <button style={{ ...btn('danger'), padding: '3px 8px', fontSize: 11 }} onClick={() => deleteLog(l.id)}>Sil</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FATURA / ÖDEME TAKİP */}
        {(tab === 'fatura' || tab === 'odeme') && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <button style={btn()} onClick={() => setTakipYil(y => y - 1)}>‹</button>
              <span style={{ fontSize: 16, fontWeight: 500, minWidth: 48, textAlign: 'center' }}>{takipYil}</span>
              <button style={btn()} onClick={() => setTakipYil(y => y + 1)}>›</button>
              <div style={{ display: 'flex', gap: 10, marginLeft: 8, flexWrap: 'wrap' }}>
                {[{ label: '✓ Tamam', bg: '#EAF3DE', color: '#3B6D11' }, { label: '! Sorun', bg: '#FCEBEB', color: '#A32D2D' }, { label: '— Bekliyor', bg: 'transparent', color: '#aaa' }].map(d => (
                  <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#888' }}>
                    <div style={{ width: 14, height: 14, borderRadius: 3, background: d.bg, border: '1px solid #e5e5e5' }} />
                    {d.label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 12, minWidth: 900 }}>
                <thead><tr>
                  <th style={{ padding: '8px 14px', border: '1px solid #e5e5e5', background: '#f5f5f3', textAlign: 'left', minWidth: 160, fontSize: 11, color: '#888', fontWeight: 600 }}>FİRMA</th>
                  {AYLAR.map((a, i) => (
                    <th key={a} style={{ padding: '7px 4px', border: '1px solid #e5e5e5', background: '#f5f5f3', textAlign: 'center', minWidth: 56, fontSize: 11, color: '#888', fontWeight: 600 }}>{a}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {firms.map(f => (
                    <tr key={f.id}>
                      <td style={{ padding: '8px 14px', border: '1px solid #e5e5e5', background: '#fff', fontSize: 13, whiteSpace: 'nowrap' }}>{f.name}</td>
                      {AYLAR.map((_, i) => {
                        const cell = getTakipCell(f.id, tab, i + 1)
                        return (
                          <td key={i} style={{ padding: 0, border: '1px solid #e5e5e5' }}>
                            <div onClick={() => toggleTakip(f.id, tab, i + 1)}
                              style={{ width: 56, height: 38, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, background: cell.bg, color: cell.color, userSelect: 'none' }}>
                              {cell.label}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* RATE ÖZETİ */}
        {tab === 'rate' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>BAŞLANGIÇ</label>
                <input type="date" value={fStart} onChange={e => setFStart(e.target.value)} style={inp} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>BİTİŞ</label>
                <input type="date" value={fEnd} onChange={e => setFEnd(e.target.value)} style={inp} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>FİRMA</label>
                <select value={fFirm} onChange={e => setFFirm(e.target.value)} style={inp}>
                  <option value="">Tümü</option>
                  {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select></div>
              <button style={btn('primary')} onClick={loadLogs}>Filtrele</button>
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, overflow: 'hidden' }}>
              {rateSummary.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#aaa', fontSize: 13 }}>Veri yok — önce aktivite girin ve filtreleyin</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ background: '#f5f5f3' }}>
                    {['Firma', 'Ay', 'Saat', 'Gün', 'Günlük Rate', 'Tutar'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', borderBottom: '1px solid #e5e5e5' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {rateSummary.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
                        <td style={{ padding: '8px 12px' }}>{firmName(r.firmId)}</td>
                        <td style={{ padding: '8px 12px' }}>{AYLAR[r.ay - 1]} {r.yil}</td>
                        <td style={{ padding: '8px 12px' }}>{r.saat}</td>
                        <td style={{ padding: '8px 12px' }}>{r.gun}</td>
                        <td style={{ padding: '8px 12px' }}>₺{r.rate.toLocaleString('tr-TR')}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>₺{r.tutar.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* MASTER DATA */}
        {tab === 'masterdata' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 20 }}>
            {/* Firmalar */}
            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>Firmalar</div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input value={newFirma} onChange={e => setNewFirma(e.target.value)} onKeyDown={e => e.key === 'Enter' && addFirma()} style={{ ...inp, flex: 1 }} placeholder="Firma adı..." />
                <button style={btn('primary')} onClick={addFirma}>+ Ekle</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {firms.map(f => (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', background: '#f5f5f3', border: '1px solid #e5e5e5', borderRadius: 20, fontSize: 13 }}>
                    {f.name}
                    <button onClick={() => deleteFirma(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Firma Rate */}
            <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 14 }}>Firma Rate (Günlük)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr auto', gap: 8, marginBottom: 14, alignItems: 'flex-end' }}>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>FİRMA</label>
                  <select value={rateFirm} onChange={e => setRateFirm(e.target.value)} style={{ ...inp, width: '100%' }}>
                    <option value="">Seçin...</option>
                    {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>YIL</label>
                  <input type="number" value={rateYil} onChange={e => setRateYil(parseInt(e.target.value))} style={{ ...inp, width: '100%' }} /></div>
                <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>GÜNLÜK RATE (₺)</label>
                  <input type="number" value={rateVal} onChange={e => setRateVal(e.target.value)} style={{ ...inp, width: '100%' }} placeholder="0" /></div>
                <button style={btn('success')} onClick={saveRate}>Kaydet</button>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead><tr style={{ background: '#f5f5f3' }}>
                  {['Firma', 'Yıl', 'Günlük Rate', ''].map(h => (
                    <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 11, color: '#888', fontWeight: 600, borderBottom: '1px solid #e5e5e5' }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {rates.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '6px 10px' }}>{firmName(r.firm_id)}</td>
                      <td style={{ padding: '6px 10px' }}>{r.yil}</td>
                      <td style={{ padding: '6px 10px' }}>₺{r.gunluk_rate.toLocaleString('tr-TR')}</td>
                      <td style={{ padding: '6px 10px' }}>
                        <button style={{ ...btn('danger'), padding: '2px 7px', fontSize: 11 }}
                          onClick={async () => { await sb.from('activity_rates').delete().eq('id', r.id); const { data } = await sb.from('activity_rates').select('*').eq('tenant_id', tenantId); setRates(data || []) }}>Sil</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Toplu Aktivite Modal */}
      {showBulk && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(480px, 96vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 20 }}>Toplu Aktivite</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>BAŞLANGIÇ</label>
                <input type="date" value={bStart} onChange={e => setBStart(e.target.value)} style={{ ...inp, width: '100%' }} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>BİTİŞ</label>
                <input type="date" value={bEnd} onChange={e => setBEnd(e.target.value)} style={{ ...inp, width: '100%' }} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>FİRMA</label>
                <select value={bFirm} onChange={e => setBFirm(e.target.value)} style={{ ...inp, width: '100%' }}>
                  {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>MODÜL</label>
                <input value={bModul} onChange={e => setBModul(e.target.value)} style={{ ...inp, width: '100%' }} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>ADET</label>
                <input type="number" value={bAdet} onChange={e => setBAdet(e.target.value)} style={{ ...inp, width: '100%' }} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>BİRİM</label>
                <select value={bBirim} onChange={e => setBBirim(e.target.value)} style={{ ...inp, width: '100%' }}>
                  {BIRIMLER.map(b => <option key={b}>{b}</option>)}
                </select></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>TANIM</label>
              <textarea value={bTanim} onChange={e => setBTanim(e.target.value)} style={{ ...inp, width: '100%', minHeight: 80, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btn()} onClick={() => setShowBulk(false)}>İptal</button>
              <button style={btn('success')} onClick={saveBulk} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Kaydet'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editLog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: 'min(480px, 96vw)', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, marginBottom: 20 }}>Aktiviteyi Düzenle</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>TARİH</label>
                <input type="date" value={editLog.date} onChange={e => setEditLog({ ...editLog, date: e.target.value })} style={{ ...inp, width: '100%' }} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>FİRMA</label>
                <select value={editLog.firm_id} onChange={e => setEditLog({ ...editLog, firm_id: e.target.value })} style={{ ...inp, width: '100%' }}>
                  {firms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>MODÜL</label>
                <input value={editLog.modul} onChange={e => setEditLog({ ...editLog, modul: e.target.value })} style={{ ...inp, width: '100%' }} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>ADET</label>
                <input type="number" value={editLog.adet} onChange={e => setEditLog({ ...editLog, adet: parseFloat(e.target.value) })} style={{ ...inp, width: '100%' }} /></div>
              <div><label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>BİRİM</label>
                <select value={editLog.birim} onChange={e => setEditLog({ ...editLog, birim: e.target.value })} style={{ ...inp, width: '100%' }}>
                  {BIRIMLER.map(b => <option key={b}>{b}</option>)}
                </select></div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>TANIM</label>
              <textarea value={editLog.tanim} onChange={e => setEditLog({ ...editLog, tanim: e.target.value })} style={{ ...inp, width: '100%', minHeight: 80, resize: 'vertical' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button style={btn()} onClick={() => setEditLog(null)}>İptal</button>
              <button style={btn('success')} onClick={updateLog} disabled={saving}>{saving ? 'Kaydediliyor...' : 'Güncelle'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#0f0f0f', color: '#fff', padding: '10px 16px', borderRadius: 8, fontSize: 13, zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
