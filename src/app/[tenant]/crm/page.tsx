'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'

const sb = createClient()

type Customer = {
  id: string
  name: string
  contact: string
  phone: string
  email: string
  notes: string
  address: string
  district: string
  city: string
  created_at: string
}

type UploadRow = {
  name: string
  contact: string
  phone: string
  email: string
  notes: string
  address: string
  district: string
  city: string
  _error?: string
}

type Filters = {
  name: string
  contact: string
  phone: string
  email: string
  city: string
  district: string
}

const emptyFilters = (): Filters => ({ name: '', contact: '', phone: '', email: '', city: '', district: '' })
const empty = (): Omit<Customer, 'id' | 'created_at'> => ({ name: '', contact: '', phone: '', email: '', notes: '', address: '', district: '', city: '' })

const COLS = '2fr 1.5fr 120px 160px 44px 44px 152px'

function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[\s\-_]/g, '')
}

function mapHeader(h: string): keyof UploadRow | null {
  const n = normalizeHeader(h)
  if (['ad', 'müşteriadi', 'firmaadi', 'müşteri', 'firma', 'name', 'musteri'].some(k => n.includes(k))) return 'name'
  if (['yetkili', 'yetkilikisi', 'contact', 'kisi'].some(k => n.includes(k))) return 'contact'
  if (['telefon', 'tel', 'phone', 'gsm', 'cep'].some(k => n.includes(k))) return 'phone'
  if (['eposta', 'email', 'mail', 'epost'].some(k => n.includes(k))) return 'email'
  if (['not', 'notlar', 'notes'].some(k => n.includes(k))) return 'notes'
  if (['acikadres', 'adres', 'address', 'sokak', 'mahalle'].some(k => n.includes(k))) return 'address'
  if (['ilce', 'district'].some(k => n.includes(k))) return 'district'
  if (n === 'il' || n === 'city' || n === 'sehir' || n === 'şehir') return 'city'
  return null
}

function parseExcel(file: File): Promise<UploadRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
        if (rows.length === 0) { resolve([]); return }
        const keys = Object.keys(rows[0])
        const mapping: Record<string, keyof UploadRow> = {}
        for (const k of keys) {
          const mapped = mapHeader(String(k))
          if (mapped) mapping[k] = mapped
        }
        const result: UploadRow[] = rows.map(row => {
          const r: UploadRow = { name: '', contact: '', phone: '', email: '', notes: '', address: '', district: '', city: '' }
          for (const [k, field] of Object.entries(mapping)) {
            r[field] = String(row[k] ?? '').trim()
          }
          if (!r.name) r._error = 'Müşteri adı boş'
          return r
        })
        resolve(result)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

export default function CRMPage() {
  const params = useParams()
  const tenant = params.tenant as string
  const router = useRouter()

  const [tenantId, setTenantId] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [form, setForm] = useState(empty())
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Customer | null>(null)
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  const [expandedAddress, setExpandedAddress] = useState<string | null>(null)

  // Filter state
  const [filters, setFilters] = useState<Filters>(emptyFilters())
  const [showFilters, setShowFilters] = useState(false)

  // Excel upload state
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadRows, setUploadRows] = useState<UploadRow[]>([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadFileName, setUploadFileName] = useState('')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const loadData = useCallback(async () => {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) { router.push(`/${tenant}/login`); return }
    const { data: tData } = await sb.from('tenants').select('id,owner_id,modules').eq('slug', tenant).single()
    if (!tData) { router.push('/'); return }
    if (!tData.modules?.includes('crm')) { router.push(`/${tenant}`); return }
    setTenantId(tData.id)
    const { data } = await sb.from('crm_customers').select('*').eq('tenant_id', tData.id).order('name')
    setCustomers(data || [])
    setLoading(false)
  }, [tenant, router])

  useEffect(() => { loadData() }, [loadData])

  function openNew() { setEditing(null); setForm(empty()); setShowModal(true) }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, contact: c.contact, phone: c.phone, email: c.email, notes: c.notes, address: c.address || '', district: c.district || '', city: c.city || '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name.trim()) { showToast('Müşteri adı zorunlu'); return }
    setSaving(true)
    if (editing) {
      const { error } = await sb.from('crm_customers').update({ ...form }).eq('id', editing.id)
      if (error) { showToast('Hata: ' + error.message); setSaving(false); return }
      setCustomers(cs => cs.map(c => c.id === editing.id ? { ...c, ...form } : c))
      showToast('Güncellendi')
    } else {
      const { data, error } = await sb.from('crm_customers').insert({ ...form, tenant_id: tenantId }).select().single()
      if (error) { showToast('Hata: ' + error.message); setSaving(false); return }
      setCustomers(cs => [...cs, data].sort((a, b) => a.name.localeCompare(b.name)))
      showToast('Eklendi')
    }
    setSaving(false)
    setShowModal(false)
  }

  async function handleDelete(c: Customer) {
    setDeleting(c.id)
    await sb.from('crm_customers').delete().eq('id', c.id)
    setCustomers(cs => cs.filter(x => x.id !== c.id))
    setConfirmDelete(null)
    setDeleting(null)
    showToast('Silindi')
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploadFileName(file.name)
    try {
      const rows = await parseExcel(file)
      if (rows.length === 0) { showToast('Dosya boş veya okunamadı'); return }
      setUploadRows(rows)
      setShowUploadModal(true)
    } catch { showToast('Dosya okunamadı. Geçerli bir Excel dosyası seçin.') }
  }

  async function handleBulkUpload() {
    const validRows = uploadRows.filter(r => !r._error)
    if (validRows.length === 0) { showToast('İçe aktarılacak geçerli satır yok'); return }
    setUploading(true)
    const payload = validRows.map(r => ({
      tenant_id: tenantId,
      name: r.name, contact: r.contact, phone: r.phone, email: r.email,
      notes: r.notes, address: r.address, district: r.district, city: r.city,
    }))
    const { error } = await sb.from('crm_customers').insert(payload)
    setUploading(false)
    if (error) { showToast('Hata: ' + error.message); return }
    showToast(`${validRows.length} müşteri içe aktarıldı`)
    setShowUploadModal(false)
    setUploadRows([])
    loadData()
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([
      ['Müşteri Adı', 'Yetkili', 'Telefon', 'E-posta', 'Not', 'Açık Adres', 'İlçe', 'İl'],
      ['ABC Teknoloji Ltd.', 'Ahmet Yılmaz', '0532 000 00 00', 'ahmet@abc.com', 'VIP müşteri', 'Atatürk Cad. No:5', 'Kadıköy', 'İstanbul'],
      ['XYZ Mağazacılık', 'Ayşe Kaya', '0544 111 22 33', 'ayse@xyz.com', '', 'Bağlar Mah. 12. Sok.', 'Nilüfer', 'Bursa'],
    ])
    ws['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 26 }, { wch: 20 }, { wch: 30 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler')
    XLSX.writeFile(wb, 'musteri_sablonu.xlsx')
  }

  function downloadExport() {
    const rows = customers.map(c => ({
      'Müşteri Adı': c.name, 'Yetkili': c.contact, 'Telefon': c.phone,
      'E-posta': c.email, 'Not': c.notes, 'Açık Adres': c.address,
      'İlçe': c.district, 'İl': c.city,
    }))
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rows)
    ws['!cols'] = [{ wch: 28 }, { wch: 18 }, { wch: 16 }, { wch: 26 }, { wch: 20 }, { wch: 30 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws, 'Müşteriler')
    XLSX.writeFile(wb, `musteriler_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const activeFilterCount = Object.values(filters).filter(v => v.trim()).length

  const filtered = customers.filter(c => {
    if (search) {
      const q = search.toLowerCase()
      const match = c.name.toLowerCase().includes(q) || c.contact.toLowerCase().includes(q) ||
        c.phone.includes(q) || c.email.toLowerCase().includes(q)
      if (!match) return false
    }
    if (filters.name && !c.name.toLowerCase().includes(filters.name.toLowerCase())) return false
    if (filters.contact && !c.contact.toLowerCase().includes(filters.contact.toLowerCase())) return false
    if (filters.phone && !c.phone.includes(filters.phone)) return false
    if (filters.email && !c.email.toLowerCase().includes(filters.email.toLowerCase())) return false
    if (filters.city && !c.city.toLowerCase().includes(filters.city.toLowerCase())) return false
    if (filters.district && !c.district.toLowerCase().includes(filters.district.toLowerCase())) return false
    return true
  })

  const inputStyle = {
    width: '100%', padding: '9px 12px', border: '1px solid rgba(15,15,15,0.15)',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'inherit', background: 'white',
  }
  const labelStyle = { fontSize: 13, color: '#555', marginBottom: 4, display: 'block' as const }
  const filterInputStyle = {
    width: '100%', padding: '7px 10px', border: '1px solid rgba(15,15,15,0.15)',
    borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
    fontFamily: 'inherit', background: 'white',
  }

  const validCount = uploadRows.filter(r => !r._error).length
  const errorCount = uploadRows.filter(r => r._error).length

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f2ec' }}>
      <p style={{ color: '#888' }}>Yükleniyor...</p>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#f5f2ec', padding: '32px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <a href={`/${tenant}?select=1`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(15,15,15,0.07)', borderRadius: 8, fontSize: 13, color: '#374151', textDecoration: 'none', fontWeight: 500 }}>← Modül Seçimi</a>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 26, margin: 0, letterSpacing: -0.5 }}>Müşteri Bilgi Sistemi</h1>
            <p style={{ fontSize: 13, color: '#888', margin: '4px 0 0' }}>Müşteri listesi</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const, justifyContent: 'flex-end' }}>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
            <button onClick={downloadTemplate}
              style={{ padding: '9px 14px', background: 'white', color: '#555', border: '1px solid rgba(15,15,15,0.2)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
              Şablon İndir
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              style={{ padding: '9px 14px', background: 'white', color: '#444', border: '1px solid rgba(15,15,15,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              Excel Yükle
            </button>
            {customers.length > 0 && (
              <button onClick={downloadExport}
                style={{ padding: '9px 14px', background: 'white', color: '#444', border: '1px solid rgba(15,15,15,0.2)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                Excel İndir
              </button>
            )}
            <button onClick={openNew}
              style={{ padding: '9px 18px', background: '#2d7a57', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              + Yeni Müşteri
            </button>
          </div>
        </div>

        {/* Arama + Filtre satırı */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
          <input
            placeholder="Hızlı ara: isim, yetkili, telefon, e-posta..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, maxWidth: 340, flex: 'none' }}
          />
          <button
            onClick={() => setShowFilters(v => !v)}
            style={{
              padding: '9px 14px', borderRadius: 8, fontSize: 13, cursor: 'pointer', fontWeight: 500,
              background: showFilters || activeFilterCount > 0 ? '#f0faf4' : 'white',
              border: `1px solid ${activeFilterCount > 0 ? 'rgba(45,122,87,0.4)' : 'rgba(15,15,15,0.2)'}`,
              color: activeFilterCount > 0 ? '#2d7a57' : '#444',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
            Filtrele
            {activeFilterCount > 0 && (
              <span style={{ background: '#2d7a57', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {activeFilterCount}
              </span>
            )}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={() => setFilters(emptyFilters())}
              style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: '0 4px' }}>
              Filtreleri temizle
            </button>
          )}
        </div>

        {/* Filtre paneli */}
        {showFilters && (
          <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 10, padding: '16px 20px', marginBottom: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px 16px' }}>
              {([
                { key: 'name', label: 'Müşteri Adı' },
                { key: 'contact', label: 'Yetkili' },
                { key: 'phone', label: 'Telefon' },
                { key: 'email', label: 'E-posta' },
                { key: 'city', label: 'İl' },
                { key: 'district', label: 'İlçe' },
              ] as { key: keyof Filters; label: string }[]).map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, color: '#999', fontWeight: 600, letterSpacing: 0.3, display: 'block', marginBottom: 4 }}>{label.toUpperCase()}</label>
                  <input
                    value={filters[key]}
                    onChange={e => setFilters(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={`${label} ile filtrele...`}
                    style={filterInputStyle}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tablo */}
        {filtered.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14, border: '1px solid rgba(15,15,15,0.08)' }}>
            {search || activeFilterCount > 0 ? 'Arama/filtre sonucu bulunamadı.' : 'Henüz müşteri eklenmedi. + Yeni Müşteri butonuna tıklayın.'}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid rgba(15,15,15,0.08)', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '10px 20px', background: '#f9f9f9', borderBottom: '1px solid rgba(15,15,15,0.08)', fontSize: 12, color: '#999', fontWeight: 600, letterSpacing: 0.3 }}>
              <span>MÜŞTERİ ADI</span>
              <span>YETKİLİ</span>
              <span>TELEFON</span>
              <span>E-POSTA</span>
              <span title="Not">NOT</span>
              <span title="Adres">ADR</span>
              <span></span>
            </div>

            {filtered.map((c, idx) => (
              <div key={c.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid rgba(15,15,15,0.06)' : 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: COLS, padding: '13px 20px', alignItems: 'center', fontSize: 14 }}>
                  <span style={{ fontWeight: 500 }}>{c.name}</span>
                  <span style={{ color: '#555' }}>{c.contact || '—'}</span>
                  <span style={{ color: '#555' }}>{c.phone || '—'}</span>
                  <span style={{ color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || '—'}</span>

                  {/* Not ikonu */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {c.notes ? (
                      <button onClick={() => setExpandedNote(expandedNote === c.id ? null : c.id)} title="Notu göster"
                        style={{ background: expandedNote === c.id ? '#f3e8ff' : 'transparent', border: '1px solid ' + (expandedNote === c.id ? 'rgba(124,58,237,0.3)' : 'rgba(15,15,15,0.12)'), borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        📝
                      </button>
                    ) : <span style={{ color: '#ddd', fontSize: 13 }}>—</span>}
                  </div>

                  {/* Adres ikonu */}
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {(c.address || c.district || c.city) ? (
                      <button onClick={() => setExpandedAddress(expandedAddress === c.id ? null : c.id)} title="Adresi göster"
                        style={{ background: expandedAddress === c.id ? '#fef9ec' : 'transparent', border: '1px solid ' + (expandedAddress === c.id ? 'rgba(202,138,4,0.4)' : 'rgba(15,15,15,0.12)'), borderRadius: 6, width: 28, height: 28, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        📍
                      </button>
                    ) : <span style={{ color: '#ddd', fontSize: 13 }}>—</span>}
                  </div>

                  {/* Butonlar */}
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button onClick={() => openEdit(c)}
                      style={{ padding: '5px 12px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#555', whiteSpace: 'nowrap' }}>
                      Düzenle
                    </button>
                    <button onClick={() => setConfirmDelete(c)}
                      style={{ padding: '5px 10px', background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 6, fontSize: 12, cursor: 'pointer', color: '#dc2626', whiteSpace: 'nowrap' }}>
                      Sil
                    </button>
                  </div>
                </div>

                {/* Not satırı */}
                {expandedNote === c.id && c.notes && (
                  <div style={{ padding: '10px 20px 14px 20px', background: '#faf8ff', borderTop: '1px solid rgba(124,58,237,0.1)' }}>
                    <p style={{ fontSize: 13, color: '#555', margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{c.notes}</p>
                  </div>
                )}

                {/* Adres satırı */}
                {expandedAddress === c.id && (c.address || c.district || c.city) && (
                  <div style={{ padding: '10px 20px 14px 20px', background: '#fffdf0', borderTop: '1px solid rgba(202,138,4,0.15)' }}>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' as const, fontSize: 13, color: '#555' }}>
                      {c.address && (
                        <span><span style={{ color: '#999', fontSize: 11, fontWeight: 600 }}>AÇIK ADRES  </span>{c.address}</span>
                      )}
                      {c.district && (
                        <span><span style={{ color: '#999', fontSize: 11, fontWeight: 600 }}>İLÇE  </span>{c.district}</span>
                      )}
                      {c.city && (
                        <span><span style={{ color: '#999', fontSize: 11, fontWeight: 600 }}>İL  </span>{c.city}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 12, color: '#bbb', marginTop: 12 }}>{filtered.length} müşteri{filtered.length !== customers.length ? ` (toplam ${customers.length})` : ''}</p>
      </div>

      {/* Ekle / Düzenle Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ fontFamily: 'Georgia, serif', fontSize: 20 }}>{editing ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</div>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={labelStyle}>Müşteri / Firma Adı *</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Örn: ABC Teknoloji Ltd." />
              </div>
              <div>
                <label style={labelStyle}>Yetkili Kişi</label>
                <input style={inputStyle} value={form.contact} onChange={e => setForm(f => ({ ...f, contact: e.target.value }))} placeholder="Örn: Ahmet Yılmaz" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Telefon</label>
                  <input style={inputStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0532 000 00 00" />
                </div>
                <div>
                  <label style={labelStyle}>E-posta</label>
                  <input style={inputStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="ornek@firma.com" type="email" />
                </div>
              </div>

              {/* Adres */}
              <div style={{ borderTop: '1px solid rgba(15,15,15,0.08)', paddingTop: 14 }}>
                <p style={{ fontSize: 12, color: '#aaa', fontWeight: 600, letterSpacing: 0.3, margin: '0 0 12px' }}>ADRES BİLGİLERİ</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Açık Adres</label>
                    <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }} value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Mahalle, sokak, bina no..." />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>İlçe</label>
                      <input style={inputStyle} value={form.district} onChange={e => setForm(f => ({ ...f, district: e.target.value }))} placeholder="Örn: Kadıköy" />
                    </div>
                    <div>
                      <label style={labelStyle}>İl</label>
                      <input style={inputStyle} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Örn: İstanbul" />
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Notlar</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opsiyonel notlar..." />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                İptal
              </button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: '9px 22px', background: '#2d7a57', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Kaydediliyor...' : (editing ? 'Güncelle' : 'Ekle')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Excel Yükle Modal */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget && !uploading) { setShowUploadModal(false); setUploadRows([]) } }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: '100%', maxWidth: 760, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 20 }}>Excel İçe Aktarma</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{uploadFileName}</div>
              </div>
              {!uploading && (
                <button onClick={() => { setShowUploadModal(false); setUploadRows([]) }}
                  style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>×</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ padding: '8px 14px', background: '#f0faf4', border: '1px solid rgba(45,122,87,0.2)', borderRadius: 8, fontSize: 13 }}>
                <span style={{ color: '#2d7a57', fontWeight: 600 }}>{validCount}</span>
                <span style={{ color: '#555' }}> geçerli satır</span>
              </div>
              {errorCount > 0 && (
                <div style={{ padding: '8px 14px', background: '#fff5f5', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, fontSize: 13 }}>
                  <span style={{ color: '#dc2626', fontWeight: 600 }}>{errorCount}</span>
                  <span style={{ color: '#555' }}> hatalı satır (atlanacak)</span>
                </div>
              )}
            </div>
            <div style={{ overflowY: 'auto', flex: 1, border: '1px solid rgba(15,15,15,0.1)', borderRadius: 8 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9f9f9', position: 'sticky', top: 0 }}>
                    {['MÜŞTERİ ADI', 'YETKİLİ', 'TELEFON', 'İL', 'İLÇE', 'DURUM'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#999', fontSize: 11, letterSpacing: 0.3, borderBottom: '1px solid rgba(15,15,15,0.08)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {uploadRows.map((r, i) => (
                    <tr key={i} style={{ background: r._error ? '#fff8f8' : 'white', borderBottom: '1px solid rgba(15,15,15,0.05)' }}>
                      <td style={{ padding: '7px 12px', fontWeight: r._error ? 400 : 500, color: r._error ? '#ccc' : '#1a1a1a' }}>{r.name || '—'}</td>
                      <td style={{ padding: '7px 12px', color: '#555' }}>{r.contact || '—'}</td>
                      <td style={{ padding: '7px 12px', color: '#555' }}>{r.phone || '—'}</td>
                      <td style={{ padding: '7px 12px', color: '#555' }}>{r.city || '—'}</td>
                      <td style={{ padding: '7px 12px', color: '#555' }}>{r.district || '—'}</td>
                      <td style={{ padding: '7px 12px' }}>
                        {r._error
                          ? <span style={{ fontSize: 11, color: '#dc2626', background: '#fee2e2', padding: '2px 7px', borderRadius: 4 }}>{r._error}</span>
                          : <span style={{ fontSize: 11, color: '#2d7a57', background: '#dcfce7', padding: '2px 7px', borderRadius: 4 }}>Tamam</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 }}>
              <p style={{ fontSize: 12, color: '#aaa', margin: 0 }}>Beklenen başlıklar: Müşteri Adı / Yetkili / Telefon / E-posta / Not / Açık Adres / İlçe / İl</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => { setShowUploadModal(false); setUploadRows([]) }} disabled={uploading}
                  style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 14, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.5 : 1 }}>
                  İptal
                </button>
                <button onClick={handleBulkUpload} disabled={uploading || validCount === 0}
                  style={{ padding: '9px 22px', background: '#2d7a57', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: (uploading || validCount === 0) ? 'not-allowed' : 'pointer', opacity: (uploading || validCount === 0) ? 0.6 : 1 }}>
                  {uploading ? 'İçe Aktarılıyor...' : `${validCount} Müşteriyi İçe Aktar`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Silme onayı */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={e => { if (e.target === e.currentTarget) setConfirmDelete(null) }}>
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: '100%', maxWidth: 380 }}>
            <div style={{ fontFamily: 'Georgia, serif', fontSize: 19, marginBottom: 10 }}>Müşteriyi sil?</div>
            <p style={{ fontSize: 14, color: '#555', marginBottom: 22 }}>
              <strong>{confirmDelete.name}</strong> kalıcı olarak silinecek. Bu işlem geri alınamaz.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setConfirmDelete(null)}
                style={{ padding: '9px 18px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                İptal
              </button>
              <button onClick={() => handleDelete(confirmDelete)} disabled={!!deleting}
                style={{ padding: '9px 22px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1 }}>
                {deleting ? 'Siliniyor...' : 'Sil'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: 'fixed', bottom: 24, right: 24, background: '#1a1a1a', color: 'white', padding: '10px 18px', borderRadius: 8, fontSize: 14, zIndex: 100 }}>
          {toast}
        </div>
      )}
    </div>
  )
}
