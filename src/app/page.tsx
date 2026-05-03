'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const MODULES = [
  {
    id: 'dealer_orders',
    name: 'Bayi Sipariş Yönetimi',
    short: 'Sipariş & onay akışı',
    icon: '🏪',
    desc: 'Bayilerinizden gelen siparişleri merkezi olarak yönetin. Bayi bazlı özel fiyatlandırma, kota yönetimi, şube teslimatı ve onay akışıyla tüm süreci tek ekrandan takip edin.',
    features: ['Bayi bazlı özel fiyat ve kota', 'Şube & randevulu teslimat', 'Sipariş onay akışı', 'Kalem bazlı durum takibi'],
    videoUrl: '',
  },
  {
    id: 'stock',
    name: 'Stok Yönetimi',
    short: 'Envanter & hareketler',
    icon: '📦',
    desc: 'Ürün envanterinizi gerçek zamanlı takip edin. Sipariş onaylandığında otomatik stok düşme, düşük stok uyarıları ve kategori bazlı ürün yönetimiyle envanter kontrolünü kaybetmeyin.',
    features: ['Gerçek zamanlı stok takibi', 'Otomatik stok düşme (sipariş onayı)', 'Düşük stok uyarısı', 'Ürün kategori yönetimi'],
    videoUrl: '',
  },
  {
    id: 'crm',
    name: 'Müşteri Bilgileri Yönetimi',
    short: 'Müşteri kayıt & takip',
    icon: '👥',
    desc: 'Müşteri portföyünüzü merkezi bir veritabanında tutun. Excel ile toplu import/export, bölge & şehir bazlı filtreleme ve müşteri notlarıyla ilişkilerinizi güçlendirin.',
    features: ['Müşteri kayıt ve takibi', 'Excel import / export', 'Bölge & şehir filtreleri', 'Notlar ve adres yönetimi'],
    videoUrl: '',
  },
  {
    id: 'gider',
    name: 'Gider Takip Yönetimi',
    short: 'Harcama ve gider yönetimi',
    icon: '💰',
    desc: 'Şirket harcamalarınızı kategori bazlı kayıt altına alın. Dönemsel raporlarla gider trendlerinizi analiz edin ve bütçe kontrolünü elinizde tutun.',
    features: ['Gider kategorileri', 'Harcama girişi ve listesi', 'Dönemsel raporlama', 'Bütçe takibi'],
    videoUrl: '',
  },
  {
    id: 'aktivite',
    name: 'Aktivite Yönetimi',
    short: 'Firma aktiviteleri & raporlar',
    icon: '📋',
    desc: 'Saha ekibinizin firma ziyaretlerini, aktivitelerini ve saat girişlerini kayıt altına alın. Firma bazlı rate yönetimi ve fatura takibiyle operasyonel maliyetlerinizi kontrol edin.',
    features: ['Aktivite ve saat girişi', 'Firma bazlı rate yönetimi', 'Fatura ve ödeme takibi', 'Rate özeti raporları'],
    videoUrl: '',
  },
]

const BASE = 790
const EXTRA = 100

export default function LandingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)

  function toggleModule(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function toggleExpand(id: string) {
    setExpanded(prev => prev === id ? null : id)
  }

  const total = selected.length === 0 ? 0 : BASE + (selected.length - 1) * EXTRA

  function handleStart() {
    const params = selected.length > 0 ? `?modules=${selected.join(',')}` : ''
    router.push(`/register${params}`)
  }

  return (
    <div style={{ fontFamily: "'Georgia', serif", background: '#f0f0f0', minHeight: '100vh', color: '#0f0f0f' }}>

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(240,240,240,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(15,15,15,0.1)', padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 20, letterSpacing: -0.5 }}>Simple<span style={{ color: '#2d7a57' }}>OR</span>der</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/login" style={{ padding: '8px 18px', background: 'transparent', border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8, fontSize: 13, textDecoration: 'none', color: '#0f0f0f', fontFamily: 'sans-serif' }}>Giriş Yap</Link>
          <a href="#pricing" style={{ padding: '8px 18px', background: '#0f0f0f', color: '#f5f2ec', borderRadius: 8, fontSize: 13, border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', textDecoration: 'none' }}>Ücretsiz Dene</a>
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
          <a href="#pricing" style={{ padding: '14px 32px', background: '#0f0f0f', color: '#f5f2ec', borderRadius: 8, fontSize: 15, textDecoration: 'none', fontFamily: 'sans-serif', fontWeight: 500 }}>Modül Seç →</a>
          <a href="#modules" style={{ padding: '14px 32px', background: 'transparent', border: '1px solid rgba(15,15,15,0.2)', borderRadius: 8, fontSize: 15, textDecoration: 'none', color: '#0f0f0f', fontFamily: 'sans-serif' }}>Özellikleri Gör</a>
        </div>
        <div style={{ display: 'flex', gap: 48, marginTop: 80, paddingTop: 40, borderTop: '1px solid rgba(15,15,15,0.1)', flexWrap: 'wrap' }}>
          {[{ num: '5', label: 'Modül' }, { num: '∞', label: 'Ölçeklenebilir' }, { num: '14', label: 'Gün ücretsiz' }].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: 36, letterSpacing: -1 }}>{s.num}</div>
              <div style={{ fontSize: 13, color: 'rgba(15,15,15,0.6)', fontFamily: 'sans-serif', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MODÜLLER — çerçeveli akordeon kartlar */}
      <section id="modules" style={{ padding: '80px 5vw', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.6)', marginBottom: 16, fontFamily: 'sans-serif' }}>Modüller</div>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: -1.5, marginBottom: 48 }}>Her modül kendi dünyası,<br />tek platform.</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MODULES.map((m) => {
            const isExp = expanded === m.id
            return (
              <div key={m.id} style={{
                background: isExp ? 'white' : 'white',
                border: isExp ? '2px solid #2d7a57' : '1px solid rgba(15,15,15,0.12)',
                borderRadius: 14,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                boxShadow: isExp ? '0 4px 20px rgba(45,122,87,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>
                {/* Başlık */}
                <button onClick={() => toggleExpand(m.id)} style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 16,
                  padding: '20px 24px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                }}>
                  <span style={{
                    width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                    background: isExp ? '#e8f0ec' : '#f5f5f5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                    transition: 'background 0.2s',
                  }}>{m.icon}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ display: 'block', fontSize: 17, letterSpacing: -0.3, fontWeight: isExp ? 600 : 400 }}>{m.name}</span>
                    <span style={{ display: 'block', fontSize: 13, color: 'rgba(15,15,15,0.5)', fontFamily: 'sans-serif', marginTop: 2 }}>{m.short}</span>
                  </span>
                  <span style={{
                    width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                    border: '1.5px solid', borderColor: isExp ? '#2d7a57' : 'rgba(15,15,15,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: isExp ? '#2d7a57' : 'rgba(15,15,15,0.4)',
                    transform: isExp ? 'rotate(45deg)' : 'none',
                    transition: 'all 0.2s',
                  }}>+</span>
                </button>

                {/* Açılan içerik */}
                {isExp && (
                  <div style={{ padding: '4px 24px 28px 84px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
                    <div>
                      <p style={{ fontSize: 14, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.65)', lineHeight: 1.75, marginBottom: 20 }}>{m.desc}</p>
                      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {m.features.map(f => (
                          <li key={f} style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.7)', display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#2d7a57', color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ borderRadius: 10, overflow: 'hidden', background: '#f5f5f5', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {m.videoUrl
                        ? <iframe src={m.videoUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                        : <span style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.3)' }}>Demo videosu yakında</span>
                      }
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* FİYATLANDIRMA — yuvarlak seçici */}
      <section id="pricing" style={{ padding: '80px 5vw', background: '#ede9e0' }}>
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.6)', marginBottom: 16, fontFamily: 'sans-serif' }}>Fiyatlandırma</div>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: -1.5, marginBottom: 12 }}>İstediğin modülü seç,<br />sepete <em style={{ color: '#2d7a57' }}>ekle</em>.</h2>
          <p style={{ fontSize: 14, color: 'rgba(15,15,15,0.6)', fontFamily: 'sans-serif', marginBottom: 36 }}>
            İlk modül ₺{BASE.toLocaleString('tr-TR')}/ay · Her ek modül +₺{EXTRA}/ay
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
            {MODULES.map((m) => {
              const isSel = selected.includes(m.id)
              const selIdx = selected.indexOf(m.id)
              const price = selIdx === 0 ? BASE : EXTRA
              return (
                <div key={m.id} onClick={() => toggleModule(m.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 20px', cursor: 'pointer', userSelect: 'none',
                    borderRadius: 100,
                    border: isSel ? '2px solid #2d7a57' : '1.5px solid rgba(15,15,15,0.15)',
                    background: isSel ? '#f0fdf6' : 'white',
                    transition: 'all 0.15s',
                  }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: isSel ? 'none' : '2px solid rgba(15,15,15,0.2)',
                    background: isSel ? '#2d7a57' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.15s',
                  }}>
                    {isSel && <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>✓</span>}
                  </span>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                  <span style={{ flex: 1 }}>
                    <span style={{ fontSize: 14, fontFamily: 'sans-serif', fontWeight: isSel ? 600 : 400, color: isSel ? '#0f0f0f' : 'rgba(15,15,15,0.75)' }}>{m.name}</span>
                  </span>
                  <span style={{ fontSize: 13, fontFamily: 'sans-serif', fontWeight: isSel ? 600 : 400, color: isSel ? '#2d7a57' : 'rgba(15,15,15,0.3)', flexShrink: 0 }}>
                    {isSel ? `₺${price.toLocaleString('tr-TR')}/ay${selIdx > 0 ? ' ek' : ''}` : `₺${(selected.length === 0 ? BASE : EXTRA).toLocaleString('tr-TR')}`}
                  </span>
                </div>
              )
            })}
          </div>

          {selected.length > 0 && (
            <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)', marginBottom: 2 }}>Aylık toplam</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)' }}>₺</span>
                  <span style={{ fontSize: 36, letterSpacing: -1.5 }}>{total.toLocaleString('tr-TR')}</span>
                  <span style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)' }}>/ay</span>
                </div>
              </div>
              <div style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)', textAlign: 'right', lineHeight: 1.9 }}>
                {selected.map((id, i) => {
                  const mod = MODULES.find(x => x.id === id)!
                  return <div key={id}>{mod.name}: ₺{(i === 0 ? BASE : EXTRA).toLocaleString('tr-TR')}{i > 0 ? ' ek' : ''}</div>
                })}
              </div>
            </div>
          )}

          <button onClick={handleStart}
            style={{ display: 'block', width: '100%', textAlign: 'center', padding: 14, background: selected.length > 0 ? '#2d7a57' : '#0f0f0f', color: '#f5f2ec', borderRadius: 9, fontSize: 14, border: 'none', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: 500, transition: 'background 0.15s' }}>
            {selected.length === 0 ? '14 Gün Ücretsiz Dene →' : `${selected.length} modül ile 14 gün ücretsiz dene →`}
          </button>
          <p style={{ textAlign: 'center', fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.4)', marginTop: 10 }}>
            14 gün ücretsiz · Kredi kartı gerekmez · İstediğin zaman iptal
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(15,15,15,0.1)', padding: '32px 5vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontSize: 16 }}>Simple<span style={{ color: '#2d7a57' }}>OR</span>der</div>
        <p style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)' }}>© 2026 SimpleORder</p>
        <div style={{ display: 'flex', gap: 20 }}>
          {[{ label: 'Gizlilik', href: '/gizlilik' }, { label: 'Kullanım Koşulları', href: '/kullanim-kosullari' }, { label: 'İletişim', href: 'mailto:info@simpleor.com' }].map(l => (
            <a key={l.label} href={l.href} style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)', textDecoration: 'none' }}>{l.label}</a>
          ))}
        </div>
      </footer>

    </div>
  )
}
