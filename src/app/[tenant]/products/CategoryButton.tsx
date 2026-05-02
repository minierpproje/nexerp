'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Level = { id: string; name: string; sort_order: number }
type LevelValue = { id: string; name: string }

export default function CategoryButton({ slug }: { slug: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [levels, setLevels] = useState<Level[]>([])
  const [values, setValues] = useState<Record<string, LevelValue[]>>({})
  const [expandedLevel, setExpandedLevel] = useState<string | null>(null)
  const [newLevelName, setNewLevelName] = useState('')
  const [newValues, setNewValues] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const dragItem = useRef<number | null>(null)
  const dragOver = useRef<number | null>(null)
  const dirty = useRef(false)

  useEffect(() => {
    supabase.from('tenants').select('id').eq('slug', slug).single()
      .then(({ data }) => { if (data) setTenantId(data.id) })
  }, [slug])

  async function fetchLevels(tid: string) {
    const { data } = await supabase
      .from('product_category_levels').select('id, name, sort_order')
      .eq('tenant_id', tid).order('sort_order')
    setLevels(data || [])
  }

  async function fetchValues(tid: string, levelId: string) {
    const { data } = await supabase
      .from('product_category_values').select('id, name')
      .eq('tenant_id', tid).eq('level_id', levelId).order('name')
    setValues(prev => ({ ...prev, [levelId]: data || [] }))
  }

  useEffect(() => {
    if (open && tenantId) fetchLevels(tenantId)
  }, [open, tenantId])

  function handleClose() {
    setOpen(false)
    if (dirty.current) {
      dirty.current = false
      router.refresh()
    }
  }

  async function handleToggleLevel(levelId: string) {
    if (expandedLevel === levelId) { setExpandedLevel(null); return }
    setExpandedLevel(levelId)
    if (tenantId && !values[levelId]) await fetchValues(tenantId, levelId)
  }

  async function addLevel(name: string) {
    if (!tenantId || !name.trim() || busy) return
    setBusy(true)
    const maxOrder = levels.length > 0 ? Math.max(...levels.map(l => l.sort_order)) + 1 : 0
    await supabase.from('product_category_levels').insert({ tenant_id: tenantId, name: name.trim(), sort_order: maxOrder })
    await fetchLevels(tenantId)
    setNewLevelName('')
    dirty.current = true
    setBusy(false)
  }

  async function deleteLevel(id: string) {
    if (!tenantId) return
    await supabase.from('product_category_levels').delete().eq('id', id)
    setExpandedLevel(prev => prev === id ? null : prev)
    setValues(prev => { const n = { ...prev }; delete n[id]; return n })
    await fetchLevels(tenantId)
    dirty.current = true
  }

  async function addValue(levelId: string) {
    const name = (newValues[levelId] || '').trim()
    if (!tenantId || !name || busy) return
    setBusy(true)
    await supabase.from('product_category_values').insert({ tenant_id: tenantId, level_id: levelId, name })
    await fetchValues(tenantId, levelId)
    setNewValues(prev => ({ ...prev, [levelId]: '' }))
    dirty.current = true
    setBusy(false)
  }

  async function deleteValue(levelId: string, valueId: string) {
    await supabase.from('product_category_values').delete().eq('id', valueId)
    setValues(prev => ({ ...prev, [levelId]: (prev[levelId] || []).filter(v => v.id !== valueId) }))
    dirty.current = true
  }

  async function handleDragEnd() {
    if (dragItem.current === null || dragOver.current === null || !tenantId) return
    if (dragItem.current === dragOver.current) return
    const reordered = [...levels]
    const [moved] = reordered.splice(dragItem.current, 1)
    reordered.splice(dragOver.current, 0, moved)
    const updated = reordered.map((l, i) => ({ ...l, sort_order: i }))
    setLevels(updated)
    dragItem.current = null
    dragOver.current = null
    dirty.current = true
    await Promise.all(updated.map(l =>
      supabase.from('product_category_levels').update({ sort_order: l.sort_order }).eq('id', l.id)
    ))
  }

  const PRESET_LEVELS = ['Kategori', 'Marka', 'Alt Grup']
  const existingNames = levels.map(l => l.name.toLowerCase())

  return (
    <>
      <button
        onClick={() => { dirty.current = false; setOpen(true) }}
        style={{ padding: '9px 18px', background: 'white', color: '#0f0f0f', borderRadius: 8, fontSize: 13, fontWeight: 500, border: '1px solid rgba(15,15,15,0.2)', cursor: 'pointer' }}
      >
        Kategoriler
      </button>

      {open && (
        <div
          onClick={e => { if (e.target === e.currentTarget) handleClose() }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div style={{ background: 'white', borderRadius: 14, padding: 28, width: 460, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
              <h2 style={{ fontFamily: 'Georgia, serif', fontSize: 22, margin: 0 }}>Urun Hiyerarsisi</h2>
              <button onClick={handleClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888', lineHeight: 1 }}>x</button>
            </div>

            {levels.length === 0 && (
              <p style={{ fontSize: 13, color: '#aaa', marginBottom: 16 }}>Henuz seviye yok. Asagidan ekleyin.</p>
            )}

            <div style={{ marginBottom: 20 }}>
              {levels.map((level, idx) => (
                <div
                  key={level.id}
                  draggable
                  onDragStart={() => { dragItem.current = idx }}
                  onDragEnter={() => { dragOver.current = idx }}
                  onDragEnd={handleDragEnd}
                  onDragOver={e => e.preventDefault()}
                  style={{ marginBottom: 8, border: '1px solid rgba(15,15,15,0.1)', borderRadius: 10, overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#fafafa' }}>
                    <span style={{ color: '#bbb', fontSize: 15, cursor: 'grab', userSelect: 'none', letterSpacing: 2 }}>:: ::</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{idx + 1}. {level.name}</span>
                    <button
                      onClick={() => handleToggleLevel(level.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#888', padding: '2px 8px' }}
                    >
                      {expandedLevel === level.id ? 'Kapat' : 'Degerler'}
                    </button>
                    <button
                      onClick={() => deleteLevel(level.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fca5a5', fontSize: 18, lineHeight: 1, padding: 0 }}
                    >x</button>
                  </div>

                  {expandedLevel === level.id && (
                    <div style={{ padding: '10px 12px', borderTop: '1px solid rgba(15,15,15,0.06)' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                        {(values[level.id] || []).map(val => (
                          <span key={val.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: '#f0fdf4', color: '#16a34a', borderRadius: 20, fontSize: 12, fontWeight: 500, border: '1px solid #bbf7d0' }}>
                            {val.name}
                            <button onClick={() => deleteValue(level.id, val.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#86efac', fontSize: 14, lineHeight: 1, padding: 0 }}>x</button>
                          </span>
                        ))}
                        {(values[level.id] || []).length === 0 && (
                          <span style={{ fontSize: 12, color: '#bbb' }}>Deger yok</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input
                          type="text"
                          value={newValues[level.id] || ''}
                          onChange={e => setNewValues(prev => ({ ...prev, [level.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && addValue(level.id)}
                          placeholder={level.name + ' degeri ekle...'}
                          style={{ flex: 1, padding: '7px 10px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 7, fontSize: 13, outline: 'none' }}
                        />
                        <button
                          onClick={() => addValue(level.id)}
                          disabled={!(newValues[level.id] || '').trim() || busy}
                          style={{ padding: '7px 14px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 500, cursor: (newValues[level.id] || '').trim() ? 'pointer' : 'not-allowed', opacity: (newValues[level.id] || '').trim() ? 1 : 0.4 }}
                        >Ekle</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Hizli Ekle</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {PRESET_LEVELS.map(name => {
                  const added = existingNames.includes(name.toLowerCase())
                  return (
                    <button key={name} onClick={() => !added && addLevel(name)} disabled={added || busy}
                      style={{ padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: added ? 'default' : 'pointer', border: '1px solid rgba(15,15,15,0.15)', background: added ? '#f5f5f5' : 'white', color: added ? '#bbb' : '#0f0f0f' }}>
                      {added ? 'v ' : '+ '}{name}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <p style={{ fontSize: 11, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 8px' }}>Ozel Seviye</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  value={newLevelName}
                  onChange={e => setNewLevelName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addLevel(newLevelName)}
                  placeholder="Seviye adi..."
                  style={{ flex: 1, padding: '9px 12px', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 14, outline: 'none' }}
                />
                <button
                  onClick={() => addLevel(newLevelName)}
                  disabled={!newLevelName.trim() || busy}
                  style={{ padding: '9px 16px', background: '#0f0f0f', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: newLevelName.trim() && !busy ? 'pointer' : 'not-allowed', opacity: newLevelName.trim() ? 1 : 0.45 }}
                >Ekle</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
