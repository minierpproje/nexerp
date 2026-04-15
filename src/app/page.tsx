'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function LandingPage() {
  const [selected, setSelected] = useState<string[]>([])
  const [isYearly, setIsYearly] = useState(false)

  const BASE = 490

  const modules = [
    { id: 'dealer', name: 'Bayi Sipariş', desc: 'Sipariş & onay akışı', icon: '🏪', bg: '#e8f0ec' },
    { id: 'activity', name: 'Aktivite', desc: 'Proje & zaman takibi', icon: '⏱', bg: '#faeae3' },
    { id: 'stock', name: 'Stok Yönetimi', desc: 'Envanter & hareketler', icon: '📦', bg: '#e8f0fb' },
  ]

  function modPrice(idx: number) {
    if (idx === 0) return BASE
    if (idx === 1) return Math.round(BASE * 0.70)
    return Math.round(BASE * 0.70 * 0.70)
  }

  function toggleModule(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const total = selected.reduce((sum, id, i) => sum + modPrice(i), 0)
  const yearlyTotal = Math.round(total * 12 * 0.80)
  const saved = selected.reduce((sum, id, i) => sum + (BASE - modPrice(i)), 0)

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: '#f5f2ec', minHeight: '100vh', color: '#0f0f0f' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(245,242,236,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(15,15,15,0.1)', padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, letterSpacing: -0.5 }}>Nex<span style={{ color: '#2d7a57' }}>ERP</span></div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f', fontFamily: 'sans-serif' }}>
            Giriş Yap
          </Link>
          <Link href="/register" style={{ padding: '8px 18px', background: '#0f0f0f', color: '#f5f2ec', borderRadius: 8, fontSize: 13, textDecoration: 'none', fontFamily: 'sans-serif' }}>
            Ücretsiz Dene →
          </Link>
        </div>
      </nav>

      {/* HERO */}
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
          <Link href="/register" style={{ padding: '14px 32px', background: '#0f0f0f', color: '#f5f2ec', borderRadius: 8, fontSize: 15, textDecoration: 'none', fontFamily: 'sans-serif', fontWeight: 500 }}>
            14 Gün Ücretsiz Dene →
          </Link>
          <a href="#pricing" style={{ padding: '14px 32px', background: 'transparent', border: '1px solid rgba(15,15,15,0.2)', borderRadius: 8, fontSize: 15, textDecoration: 'none', color: '#0f0f0f', fontFamily: 'sans-serif' }}>
            Fiyatları Gör
          </a>
        </div>

        <div style={{ display: 'flex', gap: 48, marginTop: 80, paddingTop: 40, borderTop: '1px solid rgba(15,15,15,0.1)', flexWrap: 'wrap' }}>
          {[{ num: '3+', label: 'Aktif modül' }, { num: '∞', label: 'Ölçeklenebilir' }, { num: '1', label: 'Merkezi giriş' }].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 36, letterSpacing: -1 }}>{s.num}</div>
              <div style={{ fontSize: 13, color: 'rgba(15,15,15,0.6)', fontFamily: 'sans-serif', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MODÜLLER */}
      <section style={{ padding: '80px 5vw', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.6)', marginBottom: 16, fontFamily: 'sans-serif' }}>Modüller</div>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: -1.5, marginBottom: 48 }}>Her modül kendi dünyası,<br />tek platform.</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2, background: 'rgba(15,15,15,0.1)', borderRadius: 14, overflow: 'hidden' }}>
          {[
            { icon: '🏪', name: 'Bayi Sipariş Yönetimi', desc: 'Bayilerden gelen siparişleri merkezi olarak yönetin.', features: ['Sipariş oluşturma ve takibi', 'Bayi bazlı fiyatlandırma', 'Onay akışı ve bildirimler'], color: '#e8f0ec' },
            { icon: '⏱', name: 'Aktivite Yönetimi', desc: 'Danışmanlık projelerini ve zaman girişlerini takip edin.', features: ['Proje ve danışman takibi', 'Zaman girişleri ve onay', 'Excel raporlama'], color: '#faeae3' },
            { icon: '📦', name: 'Stok Yönetimi', desc: 'Ürün envanterinizi gerçek zamanlı takip edin.', features: ['Ürün ve kategori yönetimi', 'Giriş / çıkış hareketleri', 'Düşük stok uyarısı'], color: '#e8f0fb' },
          ].map(m => (
            <div key={m.name} style={{ background: '#f5f2ec', padding: '36px', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#ede9e0')}
              onMouseLeave={e => (e.currentTarget.style.background = '#f5f2ec')}>
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

      {/* PRİCİNG */}
      <section id="pricing" style={{ padding: '80px 5vw', background: '#ede9e0' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.6)', marginBottom: 16, fontFamily: 'sans-serif' }}>Fiyatlandırma</div>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: -1.5, marginBottom: 12 }}>İstediğin modülü seç,<br />fiyatı <em style={{ color: '#2d7a57' }}>anında</em> gör.</h2>
          <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.6)', fontFamily: 'sans-serif', marginBottom: 36 }}>
            Her modül ₺490/ay'dan başlar. 2. modülde %30, 3. modülde ek %30 indirim.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 24 }}>
            {modules.map((m, i) => {
              const isSel = selected.includes(m.id)
              const selIdx = selected.indexOf(m.id)
              const price = isSel ? modPrice(selIdx) : BASE
              return (
                <div key={m.id} onClick={() => toggleModule(m.id)}
                  style={{ background: isSel ? m.bg : 'white', border: isSel ? '2px solid #2d7a57' : '1px solid rgba(15,15,15,0.1)', borderRadius: 12, padding: 18, cursor: 'pointer', transition: 'all 0.15s', userSelect: 'none', position: 'relative' }}>
                  {isSel && <div style={{ position: 'absolute', top: -7, right: -7, width: 20, height: 20, borderRadius: '50%', background: '#2d7a57', color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: 'sans-serif' }}>✓</div>}
                  <div style={{ fontSize: 20, marginBottom: 10 }}>{m.icon}</div>
                  <div style={{ fontSize: 13, fontFamily: 'sans-serif', fontWeight: 500, marginBottom: 3 }}>{m.name}</div>
                  <div style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)' }}>₺{price.toLocaleString('tr-TR')}/ay</div>
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
                  {selected.length > 0 && (
                    <div style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)', marginTop: 4 }}>
                      Yıllık: ₺{yearlyTotal.toLocaleString('tr-TR')}/yıl (%20 ek indirim)
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {saved > 0 && (
                    <div style={{ fontSize: 12, fontFamily: 'sans-serif', padding: '3px 10px', borderRadius: 20, background: '#e8f0ec', color: '#2d7a57', fontWeight: 500, marginBottom: 8 }}>
                      ₺{saved.toLocaleString('tr-TR')} tasarruf
                    </div>
                  )}
                  <div style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)', lineHeight: 1.8 }}>
                    {selected.map((id, i) => {
                      const m = modules.find(x => x.id === id)!
                      return <div key={id}>{m.name}: ₺{modPrice(i).toLocaleString('tr-TR')}{i > 0 ? ` (-%${i === 1 ? 30 : 51})` : ''}</div>
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          <Link href="/register" style={{ display: 'block', textAlign: 'center', padding: 14, background: '#0f0f0f', color: '#f5f2ec', borderRadius: 9, fontSize: 14, textDecoration: 'none', fontFamily: 'sans-serif', fontWeight: 500 }}>
            {selected.length === 0 ? 'Ücretsiz Başla →' : `${selected.length} modül ile başla →`}
          </Link>
          <p style={{ textAlign: 'center', fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)', marginTop: 10 }}>
            14 gün ücretsiz · Kredi kartı gerekmez · İstediğin zaman iptal
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(15,15,15,0.1)', padding: '32px 5vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontSize: 16 }}>Nex<span style={{ color: '#2d7a57' }}>ERP</span></div>
        <p style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)' }}>© 2026 NexERP</p>
        <div style={{ display: 'flex', gap: 20 }}>
          {['Gizlilik', 'Kullanım Koşulları', 'İletişim'].map(l => (
            <a key={l} href="#" style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)', textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
      </footer>

    </div>
  )
}