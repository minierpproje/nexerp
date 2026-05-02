'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const MODULES = [
  { id: 'dealer_orders', name: 'Bayi Sipariş', desc: 'Sipariş & onay akışı', icon: '🏪', bg: '#e8f0ec' },
  { id: 'aktivite', name: 'Aktivite Yönetimi', desc: 'Firma aktiviteleri & raporlar', icon: '📋', bg: '#fef3e2' },
  { id: 'stock', name: 'Stok Yönetimi', desc: 'Envanter & hareketler', icon: '📦', bg: '#e8f0fb' },
  { id: 'crm', name: 'CRM', desc: 'Müşteri ilişkileri yönetimi', icon: '👥', bg: '#f0e8fb' },
  { id: 'gider', name: 'Gider Takibi', desc: 'Harcama ve gider yönetimi', icon: '💰', bg: '#e8fbe8' },
]

const BASE = 790

export default function LandingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  function modPrice(idx: number) {
    if (idx === 0) return BASE
    return Math.round(BASE * 0.70)
  }

  function toggleModule(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const total = selected.reduce((sum, _, i) => sum + modPrice(i), 0)
  const yearlyTotal = Math.round(total * 12 * 0.80)
  const saved = selected.length > 1 ? selected.reduce((sum, _, i) => sum + (BASE - modPrice(i)), 0) : 0

  function handleStart() {
    const params = selected.length > 0 ? `?modules=${selected.join(',')}` : ''
    router.push(`/register${params}`)
  }

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: '#f0f0f0', minHeight: '100vh', color: '#0f0f0f' }}>

      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(240,240,240,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(15,15,15,0.1)', padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, letterSpacing: -0.5 }}>Simple<span style={{ color: '#2d7a57' }}>OR</span>der</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f', fontFamily: 'sans-serif' }}>Giriş Yap</Link>
          <a href="#pricing" style={{ padding: "8px 18px", background: "#0f0f0f", color: "#f5f2ec", borderRadius: 8, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "sans-serif", textDecoration: "none" }}>Ücretsiz Dene</a>
        </div>
      </nav>

      <section style={{ padding: '100px 5vw 80px', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#2d7a57', marginBottom: 24, fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-block', width: 24, height: 1, background: '#2d7a57' }}></span>
          Modüler ERP Platformu
        </div>
        <h1 style={{ fontSize: 'clamp(48px, 7vw, 88px)', lineHeight: 1.0, letterSpacing: -3, marginBottom: 28 }}>
          Sadece ihtiyacın<br />olan modülü <em style={{ color: '#2d7a57' }}>kullan</em>
        </h1>
        <p style={{ fontSize: 18, fontFamily: 'sans-serif', fontWeight: 300, color: 'rgba(15,15,15,0.6)', maxWidth: 500, marginBottom: 48, lineHeight: 1.7 }}>
          Tek bir platform, birbirinden bağımsız modüller. Satın aldığın kadar öde, ihtiyacın kadar büyü.
        </p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <a href="#pricing" style={{ padding: '14px 32px', background: '#0f0f0f', color: '#f5f2ec', borderRadius: 8, fontSize: 15, textDecoration: 'none', fontFamily: 'sans-serif', fontWeight: 500 }}>Modül Seç →</a>
          <a href="#modules" style={{ padding: '14px 32px', background: 'transparent', border: '1px solid rgba(15,15,15,0.2)', borderRadius: 8, fontSize: 15, textDecoration: 'none', color: '#0f0f0f', fontFamily: 'sans-serif' }}>Özellikleri Gör</a>
        </div>
        <div style={{ display: 'flex', gap: 48, marginTop: 80, paddingTop: 40, borderTop: '1px solid rgba(15,15,15,0.1)', flexWrap: 'wrap' }}>
          {[{ num: '2+', label: 'Aktif modül' }, { num: '∞', label: 'Ölçeklenebilir' }, { num: '14', label: 'Gün ücretsiz' }].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 36, letterSpacing: -1 }}>{s.num}</div>
              <div style={{ fontSize: 13, color: 'rgba(15,15,15,0.6)', fontFamily: 'sans-serif', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section id="modules" style={{ padding: '80px 5vw', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.6)', marginBottom: 16, fontFamily: 'sans-serif' }}>Modüller</div>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: -1.5, marginBottom: 48 }}>Her modül kendi dünyası,<br />tek platform.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2, background: 'rgba(15,15,15,0.1)', borderRadius: 14, overflow: 'hidden' }}>
          {[
            { icon: '🏪', name: 'Bayi Sipariş Yönetimi', desc: 'Bayilerden gelen siparişleri merkezi olarak yönetin.', features: ['Sipariş oluşturma ve takibi', 'Bayi bazlı fiyatlandırma', 'Onay akışı ve bildirimler'], color: '#e8f0ec' },
            { icon: '📋', name: 'Aktivite Yönetimi', desc: 'Saha aktivitelerinizi kaydedin ve raporlayın.', features: ['Aktivite ve saat takibi', 'Firma bazlı rate yönetimi', 'Fatura ve ödeme takibi'], color: '#fef3e2' },
            { icon: '📦', name: 'Stok Yönetimi', desc: 'Ürün envanterinizi gerçek zamanlı takip edin.', features: ['Ürün ve kategori yönetimi', 'Giriş / çıkış hareketleri', 'Düşük stok uyarısı'], color: '#e8f0fb' },
            { icon: '👥', name: 'CRM', desc: 'Müşteri ilişkilerinizi merkezi olarak yönetin.', features: ['Müşteri kayıt ve takibi', 'Excel import / export', 'Bölge & şehir filtreleri'], color: '#f0e8fb' },
            { icon: '💰', name: 'Gider Takibi', desc: 'Şirket harcamalarınızı kayıt altına alın.', features: ['Gider kategorileri', 'Harcama girişi ve listesi', 'Dönemsel raporlama'], color: '#e8fbe8' },
          ].map(m => (
            <div key={m.name} style={{ background: '#f0f0f0', padding: '36px', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e4e4e4')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f0f0f0')}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: 20 }}>{m.icon}</div>
              <div style={{ fontSize: 20, letterSpacing: -0.5, marginBottom: 10 }}>{m.name}</div>
              <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.6)', fontFamily: 'sans-serif', marginBottom: 20, lineHeight: 1.6 }}>{m.desc}</p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {m.features.map(f => (
                  <li key={f} style={{ fontSize: 13, color: 'rgba(15,15,15,0.6)', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'rgba(15,15,15,0.3)', flexShrink: 0 }}></span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" style={{ padding: '80px 5vw', background: '#ede9e0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.6)', marginBottom: 16, fontFamily: 'sans-serif' }}>Fiyatlandırma</div>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: -1.5, marginBottom: 12 }}>İstediğin modülü seç,<br />sepete <em style={{ color: '#2d7a57' }}>ekle</em>.</h2>
          <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.6)', fontFamily: 'sans-serif', marginBottom: 36 }}>
            Her modül ₺790/ay başlangıç. 2. modülde %30 indirim.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 24 }}>
            {MODULES.map((m, i) => {
              const isSel = selected.includes(m.id)
              const selIdx = selected.indexOf(m.id)
              const price = isSel ? modPrice(selIdx) : BASE
              return (
                <div key={m.id} onClick={() => toggleModule(m.id)}
                  style={{ background: isSel ? m.bg : 'white', border: isSel ? '2px solid #2d7a57' : '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none', position: 'relative' }}>
                  {isSel && <div style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%', background: '#2d7a57', color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'sans-serif' }}>✓</div>}
                  <div style={{ fontSize: 20, marginBottom: 10 }}>{m.icon}</div>
                  <div style={{ fontSize: 13, fontFamily: 'sans-serif', fontWeight: 500, marginBottom: 3 }}>{m.name}</div>
                  <div style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)', marginBottom: 10 }}>₺{price.toLocaleString('tr-TR')}/ay</div>
                  <div style={{ fontSize: 12, fontFamily: 'sans-serif', color: isSel ? '#2d7a57' : '#888', fontWeight: isSel ? 600 : 400 }}>
                    {isSel ? '✓ Sepette' : '+ Sepete Ekle'}
                  </div>
                </div>
              )
            })}
          </div>

          {selected.length > 0 && (
            <div style={{ background: 'white', border: '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: '20px 24px', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)', marginBottom: 4 }}>Aylık toplam</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                    <span style={{ fontSize: 16, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)' }}>₺</span>
                    <span style={{ fontSize: 40, letterSpacing: -2 }}>{total.toLocaleString('tr-TR')}</span>
                    <span style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)' }}>/ay</span>
                  </div>
                  <div style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)', marginTop: 4 }}>
                    Yıllık: ₺{yearlyTotal.toLocaleString('tr-TR')}/yıl (%20 ek indirim)
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {saved > 0 && (
                    <div style={{ fontSize: 12, fontFamily: 'sans-serif', padding: '3px 10px', borderRadius: 20, background: '#e8f0ec', color: '#2d7a57', fontWeight: 500, marginBottom: 8 }}>
                      ₺{saved.toLocaleString('tr-TR')} tasarruf
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)', lineHeight: 1.8 }}>
                    {selected.map((id, i) => {
                      const m = MODULES.find(x => x.id === id)!
                      return <div key={id}>{m.name}: ₺{modPrice(i).toLocaleString('tr-TR')}{i > 0 ? ' (-%30)' : ''}</div>
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button onClick={handleStart}
            style={{ display: 'block', width: '100%', textAlign: 'center', padding: 14, background: selected.length > 0 ? '#2d7a57' : '#0f0f0f', color: '#f5f2ec', borderRadius: 9, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: 500, transition: 'background 0.15s' }}>
            {selected.length === 0 ? '14 Gün Ücretsiz Dene →' : `${selected.length} modül ile 14 gün ücretsiz dene →`}
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)', marginTop: 10 }}>
            14 gün ücretsiz · Kredi kartı gerekmez · İstediğin zaman iptal
          </p>
        </div>
      </section>

      <footer style={{ borderTop: '1px solid rgba(15,15,15,0.1)', padding: '32px 5vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontSize: 16 }}>Simple<span style={{ color: '#2d7a57' }}>OR</span>der</div>
        <p style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)' }}>© 2026 SimpleORder</p>
        <div style={{ display: 'flex', gap: 20 }}>
          {[{label:'Gizlilik',href:'/gizlilik'},{label:'Kullanım Koşulları',href:'/kullanim-kosullari'},{label:'İletişim',href:'mailto:info@simpleor.com'}].map(l => (
            <a key={l.label} href={l.href} style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)', textDecoration: 'none' }}>{l.label}</a>
          ))}
        </div>
      </footer>

    </div>
  )
}
