"use client"
import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

const DEFAULT_CATEGORIES = [
  "Yemek & İçecek","Temizlik Malzemeleri","Kırtasiye & Ofis",
  "Ulaşım & Yakıt","Elektrik","Su","Doğalgaz","İnternet & Telefon",
  "Kira","Personel & SGK","Pazarlama & Reklam","Bakım & Onarım",
  "Vergi & Muhasebe","Ambalaj & Paketleme","Diğer"
]

const COLORS = ["#2d7a57","#3b82f6","#d97706","#7c3aed","#ef4444","#06b6d4","#84cc16","#f97316","#ec4899","#6366f1","#14b8a6","#8b5cf6","#f59e0b","#10b981","#6b7280"]

interface Expense { id:string; category:string; amount:number; description:string; date:string }

export default function GiderPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.tenant as string
  const supabase = createClient()

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [tenantId, setTenantId] = useState("")

  const now = new Date()
  const [month, setMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`)
  const [filterCategory, setFilterCategory] = useState("")
  const [viewMode, setViewMode] = useState<"chart"|"table">("chart")

  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ category:"", amount:"", description:"", date: now.toISOString().split("T")[0] })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")

  useEffect(() => { init() }, [])

  async function init() {
    const { data:{ session } } = await supabase.auth.getSession()
    if (!session) { router.push(`/${slug}/login`); return }
    const { data: tenant } = await supabase.from("tenants").select("id").eq("slug", slug).single()
    if (!tenant) return
    setTenantId(tenant.id)
    await load(tenant.id)
  }

  async function load(tid: string) {
    setLoading(true)
    const { data } = await supabase.from("expenses").select("*").eq("tenant_id", tid).order("date",{ ascending:false })
    setExpenses(data || [])
    setLoading(false)
  }

  const filtered = expenses.filter(e => {
    const okMonth = e.date.startsWith(month)
    const okCat = filterCategory ? e.category === filterCategory : true
    return okMonth && okCat
  })

  const usedCategories = [...new Set(expenses.map(e => e.category))]
  const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...usedCategories])]

  const chartData = [...new Set(filtered.map(e => e.category))].map(cat => ({
    cat,
    total: filtered.filter(e => e.category === cat).reduce((s,e) => s + Number(e.amount), 0)
  })).sort((a,b) => b.total - a.total)

  const totalMonth = filtered.reduce((s,e) => s + Number(e.amount), 0)
  const maxAmount = chartData.length > 0 ? Math.max(...chartData.map(d => d.total)) : 1

  function fmt(n: number) { return n.toLocaleString("tr-TR",{ minimumFractionDigits:2, maximumFractionDigits:2 }) }

  const monthOptions = Array.from({length:12},(_,i) => {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1)
    return {
      val: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`,
      label: d.toLocaleDateString("tr-TR",{ year:"numeric", month:"long" })
    }
  })

  async function handleSave() {
    if (!form.category.trim()) { setFormError("Kategori gerekli"); return }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) { setFormError("Geçerli bir tutar girin"); return }
    setSaving(true); setFormError("")
    const { error } = await supabase.from("expenses").insert({
      tenant_id: tenantId, category: form.category.trim(),
      amount: Number(form.amount), description: form.description.trim(), date: form.date
    })
    if (error) { setFormError("Hata: " + error.message); setSaving(false); return }
    await load(tenantId)
    setShowModal(false)
    setForm({ category:"", amount:"", description:"", date: now.toISOString().split("T")[0] })
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await supabase.from("expenses").delete().eq("id", id)
    setExpenses(prev => prev.filter(e => e.id !== id))
  }

  const inp: React.CSSProperties = { width:"100%", border:"1px solid rgba(0,0,0,0.15)", borderRadius:8, padding:"10px 12px", fontSize:14, boxSizing:"border-box" }

  return (
    <div style={{ minHeight:"100vh", background:"#f5f2ec", padding:"32px 24px" }}>
      <div style={{ maxWidth:900, margin:"0 auto" }}>

        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:28 }}>
          <div>
            <a href={`/${slug}?select=1`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", background: "rgba(15,15,15,0.07)", borderRadius: 8, fontSize: 13, color: "#374151", textDecoration: "none", fontWeight: 500 }}>← Geri</a>
            <h1 style={{ fontFamily:"Georgia, serif", fontSize:28, margin:"6px 0 0" }}>Gider Takip Yönetimi</h1>
          </div>
          <button onClick={() => setShowModal(true)} style={{ background:"#2d7a57", color:"#fff", border:"none", borderRadius:9, padding:"10px 20px", fontSize:14, fontWeight:600, cursor:"pointer" }}>
            + Gider Ekle
          </button>
        </div>

        <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:20, alignItems:"center" }}>
          <select value={month} onChange={e => setMonth(e.target.value)} style={{ border:"1px solid rgba(0,0,0,0.12)", borderRadius:8, padding:"8px 12px", fontSize:13, background:"#fff", cursor:"pointer" }}>
            {monthOptions.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
          </select>
          <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} style={{ border:"1px solid rgba(0,0,0,0.12)", borderRadius:8, padding:"8px 12px", fontSize:13, background:"#fff", cursor:"pointer" }}>
            <option value="">Tüm Kategoriler</option>
            {usedCategories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ marginLeft:"auto", display:"flex", border:"1px solid rgba(0,0,0,0.12)", borderRadius:8, overflow:"hidden" }}>
            {(["chart","table"] as const).map(v => (
              <button key={v} onClick={() => setViewMode(v)} style={{ padding:"8px 16px", fontSize:13, border:"none", background: viewMode===v ? "#2d7a57" : "#fff", color: viewMode===v ? "#fff" : "#666", cursor:"pointer", fontWeight: viewMode===v ? 600 : 400 }}>
                {v === "chart" ? "Grafik" : "Tablo"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ background:"#fff", borderRadius:12, padding:"20px 24px", marginBottom:16, border:"1px solid rgba(0,0,0,0.08)", display:"flex", gap:40, flexWrap:"wrap" }}>
          <div>
            <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>Toplam Gider</div>
            <div style={{ fontSize:28, fontFamily:"Georgia, serif" }}>₺{fmt(totalMonth)}</div>
          </div>
          <div>
            <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>İşlem Sayısı</div>
            <div style={{ fontSize:28, fontFamily:"Georgia, serif" }}>{filtered.length}</div>
          </div>
          {chartData.length > 0 && (
            <div>
              <div style={{ fontSize:12, color:"#888", marginBottom:4 }}>En Yüksek Kategori</div>
              <div style={{ fontSize:16, fontFamily:"Georgia, serif", marginTop:4 }}>{chartData[0].cat}</div>
              <div style={{ fontSize:13, color:"#2d7a57" }}>₺{fmt(chartData[0].total)}</div>
            </div>
          )}
        </div>

        {loading ? (
          <div style={{ textAlign:"center", padding:60, color:"#888" }}>Yükleniyor...</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:"center", padding:60, color:"#888", background:"#fff", borderRadius:12, border:"1px solid rgba(0,0,0,0.08)" }}>
            Bu dönemde gider kaydı yok.
          </div>
        ) : viewMode === "chart" ? (
          <div style={{ background:"#fff", borderRadius:12, padding:24, border:"1px solid rgba(0,0,0,0.08)" }}>
            <div style={{ fontSize:13, fontWeight:600, color:"#444", marginBottom:20 }}>Kategori Bazlı Giderler</div>
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {chartData.map((d,i) => (
                <div key={d.cat}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6, fontSize:13 }}>
                    <span style={{ color:"#333", fontWeight:500 }}>{d.cat}</span>
                    <span style={{ color:"#555" }}>₺{fmt(d.total)} <span style={{ color:"#aaa", fontSize:11 }}>({((d.total/totalMonth)*100).toFixed(1)}%)</span></span>
                  </div>
                  <div style={{ background:"#f0f0f0", borderRadius:6, height:12, overflow:"hidden" }}>
                    <div style={{ height:"100%", borderRadius:6, background:COLORS[i%COLORS.length], width:`${(d.total/maxAmount)*100}%`, transition:"width 0.4s ease" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ background:"#fff", borderRadius:12, border:"1px solid rgba(0,0,0,0.08)", overflow:"hidden" }}>
            <table style={{ width:"100%", borderCollapse:"collapse" }}>
              <thead>
                <tr style={{ borderBottom:"1px solid rgba(0,0,0,0.08)", background:"#fafafa" }}>
                  {["Tarih","Kategori","Açıklama","Tutar",""].map(h => (
                    <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:12, color:"#888", fontWeight:500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} style={{ borderBottom:"1px solid rgba(0,0,0,0.05)" }}>
                    <td style={{ padding:"12px 16px", fontSize:13, color:"#666" }}>{new Date(e.date+"T12:00:00").toLocaleDateString("tr-TR")}</td>
                    <td style={{ padding:"12px 16px", fontSize:13 }}>
                      <span style={{ background:"#f0f7f3", color:"#2d7a57", padding:"3px 10px", borderRadius:20, fontSize:12 }}>{e.category}</span>
                    </td>
                    <td style={{ padding:"12px 16px", fontSize:13, color:"#666" }}>{e.description || "-"}</td>
                    <td style={{ padding:"12px 16px", fontSize:14, fontWeight:600 }}>₺{fmt(Number(e.amount))}</td>
                    <td style={{ padding:"12px 16px" }}>
                      <button onClick={() => handleDelete(e.id)} style={{ background:"none", border:"none", color:"#ccc", cursor:"pointer", fontSize:18, padding:"2px 6px" }} title="Sil">×</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.4)", zIndex:50, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}
          onClick={e => { if (e.target === e.currentTarget) setShowModal(false) }}>
          <div style={{ background:"#fff", borderRadius:14, padding:28, width:"100%", maxWidth:420 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontFamily:"Georgia, serif", fontSize:20 }}>Gider Ekle</div>
              <button onClick={() => setShowModal(false)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#888" }}>×</button>
            </div>
            {formError && <div style={{ background:"#fef2f2", color:"#dc2626", padding:"10px 14px", borderRadius:8, fontSize:13, marginBottom:16 }}>{formError}</div>}
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:6 }}>Kategori *</label>
                <input list="cat-list" value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} placeholder="Kategori seçin veya yazın" style={inp} />
                <datalist id="cat-list">{allCategories.map(c => <option key={c} value={c}/>)}</datalist>
              </div>
              <div>
                <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:6 }}>Tutar (₺) *</label>
                <input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" style={inp} />
              </div>
              <div>
                <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:6 }}>Açıklama</label>
                <input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="İsteğe bağlı" style={inp} />
              </div>
              <div>
                <label style={{ fontSize:12, color:"#666", display:"block", marginBottom:6 }}>Tarih *</label>
                <input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} style={inp} />
              </div>
            </div>
            <button onClick={handleSave} disabled={saving} style={{ width:"100%", marginTop:20, padding:12, background:"#2d7a57", color:"#fff", border:"none", borderRadius:9, fontSize:14, fontWeight:600, cursor:saving?"not-allowed":"pointer", opacity:saving?0.7:1 }}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
