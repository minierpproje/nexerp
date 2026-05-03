'use client'

import { useState, useEffect } from 'react'
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
  },
  {
    id: 'stock',
    name: 'Stok Yönetimi',
    short: 'Envanter & hareketler',
    icon: '📦',
    desc: 'Ürün envanterinizi gerçek zamanlı takip edin. Sipariş onaylandığında otomatik stok düşme, düşük stok uyarıları ve kategori bazlı ürün yönetimiyle envanter kontrolünü kaybetmeyin.',
    features: ['Gerçek zamanlı stok takibi', 'Otomatik stok düşme (sipariş onayı)', 'Düşük stok uyarısı', 'Ürün kategori yönetimi'],
  },
  {
    id: 'crm',
    name: 'Müşteri Bilgileri Yönetimi',
    short: 'Müşteri kayıt & takip',
    icon: '👥',
    desc: 'Müşteri portföyünüzü merkezi bir veritabanında tutun. Excel ile toplu import/export, bölge & şehir bazlı filtreleme ve müşteri notlarıyla ilişkilerinizi güçlendirin.',
    features: ['Müşteri kayıt ve takibi', 'Excel import / export', 'Bölge & şehir filtreleri', 'Notlar ve adres yönetimi'],
  },
  {
    id: 'gider',
    name: 'Gider Takip Yönetimi',
    short: 'Harcama ve gider yönetimi',
    icon: '💰',
    desc: 'Şirket harcamalarınızı kategori bazlı kayıt altına alın. Dönemsel raporlarla gider trendlerinizi analiz edin ve bütçe kontrolünü elinizde tutun.',
    features: ['Gider kategorileri', 'Harcama girişi ve listesi', 'Dönemsel raporlama', 'Bütçe takibi'],
  },
  {
    id: 'aktivite',
    name: 'Aktivite Yönetimi',
    short: 'Firma aktiviteleri & raporlar',
    icon: '📋',
    desc: 'Saha ekibinizin firma ziyaretlerini, aktivitelerini ve saat girişlerini kayıt altına alın. Firma bazlı rate yönetimi ve fatura takibiyle operasyonel maliyetlerinizi kontrol edin.',
    features: ['Aktivite ve saat girişi', 'Firma bazlı rate yönetimi', 'Fatura ve ödeme takibi', 'Rate özeti raporları'],
  },
]

const FAQS = [
  {
    q: 'Kredi kartı bilgisi vermem gerekiyor mu?',
    a: '14 günlük deneme sürecinde kredi kartı bilgisi istemiyoruz. Deneme bittikten sonra devam etmek istersen ödeme bilgilerini girersin.',
  },
  {
    q: 'Kurulum veya IT desteği gerekiyor mu?',
    a: 'Hayır. SimpleORder tamamen bulut tabanlıdır. Bir internet bağlantısı ve tarayıcı yeterli; sunucu kurmanıza, yazılım yüklemenize gerek yok.',
  },
  {
    q: 'Başka yazılımlara ek ödeme yapacak mıyım?',
    a: "Hayır. SimpleORder kendi altyapısı üzerinde çalışır. Ek lisans, hosting veya entegrasyon ücreti ödemezsin. Gösterilen fiyat her şey dahil.",
  },
  {
    q: 'Mevcut verilerimi sisteme aktarabilir miyim?',
    a: 'Evet. Ürün kataloğunuzu ve müşteri verilerinizi Excel ile toplu olarak aktarabilirsiniz.',
  },
  {
    q: 'Kaç bayi / kullanıcı hesabı açabilirim?',
    a: 'Bayi sayısına sınır yoktur. Bayilerinizin her biri kendi hesabıyla sisteme giriş yapabilir ve sipariş verebilir.',
  },
  {
    q: 'Sözleşme veya taahhüt var mı?',
    a: 'Aylık abonelik sistemiyle çalışıyoruz. İstediğin zaman, herhangi bir ceza veya taahhüt olmadan iptal edebilirsin.',
  },
]

const BASE = 790
const EXTRA = 100

export default function LandingPage() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [showSticky, setShowSticky] = useState(false)

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 500)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  function toggleModule(id: string) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
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

      {/* NASIL ÇALIŞIR */}
      <section style={{ padding: '80px 5vw', background: 'white' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.6)', marginBottom: 16, fontFamily: 'sans-serif' }}>Nasıl Çalışır?</div>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: -1.5, marginBottom: 56 }}>3 adımda <em style={{ color: '#2d7a57' }}>hazır.</em></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 48 }}>
            {[
              {
                step: '01',
                title: 'Kayıt Ol',
                desc: 'E-posta adresinle 2 dakikada hesap oluştur. Kredi kartı bilgisi istenmez.',
              },
              {
                step: '02',
                title: 'Modülünü Seç',
                desc: 'İhtiyacına göre bir veya birden fazla modül seç. Sonradan kolayca ekleyebilirsin.',
              },
              {
                step: '03',
                title: 'Kullanmaya Başla',
                desc: 'Anında erişim. Kurulum yok, IT desteği yok, başka bir yere para ödeme yok.',
              },
            ].map((item) => (
              <div key={item.step} style={{ position: 'relative', paddingTop: 12 }}>
                <div style={{ fontSize: 56, letterSpacing: -3, color: 'rgba(15,15,15,0.06)', lineHeight: 1, marginBottom: 12, fontFamily: 'sans-serif', fontWeight: 700 }}>{item.step}</div>
                <h3 style={{ fontSize: 22, letterSpacing: -0.5, marginBottom: 10, fontWeight: 500 }}>{item.title}</h3>
                <p style={{ fontSize: 14, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)', lineHeight: 1.75, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 56, textAlign: 'center' }}>
            <a href="#pricing" style={{ display: 'inline-block', padding: '13px 36px', background: '#2d7a57', color: 'white', borderRadius: 8, fontSize: 14, textDecoration: 'none', fontFamily: 'sans-serif', fontWeight: 500 }}>
              Hemen Başla — Ücretsiz →
            </a>
            <p style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.4)', marginTop: 10 }}>14 gün ücretsiz · Kredi kartı gerekmez · İstediğin zaman iptal</p>
          </div>
        </div>
      </section>

      {/* MODÜLLER */}
      <section id="modules" style={{ padding: '80px 5vw', maxWidth: 900, margin: '0 auto' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.6)', marginBottom: 16, fontFamily: 'sans-serif' }}>Modüller</div>
        <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: -1.5, marginBottom: 48 }}>Her modül kendi dünyası,<br />tek platform.</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {MODULES.map((m) => {
            const isExp = expanded === m.id
            return (
              <div key={m.id} style={{
                background: 'white',
                border: isExp ? '2px solid #2d7a57' : '1px solid rgba(15,15,15,0.12)',
                borderRadius: 14,
                overflow: 'hidden',
                transition: 'border-color 0.2s',
                boxShadow: isExp ? '0 4px 20px rgba(45,122,87,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
              }}>
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

                {isExp && (
                  <div style={{ padding: '4px 24px 28px 84px' }}>
                    <p style={{ fontSize: 14, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.65)', lineHeight: 1.75, marginBottom: 20 }}>{m.desc}</p>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, margin: 0, padding: 0 }}>
                      {m.features.map(f => (
                        <li key={f} style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.7)', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 18, height: 18, borderRadius: '50%', background: '#2d7a57', color: 'white', fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* NEDEN SIMPLEORDER */}
      <section style={{ padding: '80px 5vw', background: 'white' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.6)', marginBottom: 16, fontFamily: 'sans-serif' }}>Neden SimpleORder?</div>
          <h2 style={{ fontSize: 'clamp(32px, 4vw, 52px)', letterSpacing: -1.5, marginBottom: 48 }}>Başlamak için hiçbir<br />engel <em style={{ color: '#2d7a57' }}>yok.</em></h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {[
              {
                icon: '⚡',
                title: 'Anında Erişim',
                desc: 'Kayıt olduktan saniyeler içinde sisteme girip kullanmaya başlayabilirsin. Kurulum gerektirmez.',
              },
              {
                icon: '🔒',
                title: 'Başka Ödeme Yok',
                desc: 'Lisans ücreti, hosting bedeli, entegrasyon maliyeti yok. Gösterilen fiyat her şey dahil.',
              },
              {
                icon: '🎯',
                title: '14 Gün Ücretsiz',
                desc: 'Kredi kartı vermeden 14 gün boyunca tüm özellikleri gerçek verilerinizle deneyin.',
              },
              {
                icon: '🔄',
                title: 'İstediğin Zaman İptal',
                desc: 'Taahhüt yok, ceza yok. Aboneliğini istediğin zaman tek tıkla sonlandırabilirsin.',
              },
            ].map((item) => (
              <div key={item.title} style={{
                background: '#f8f8f6',
                border: '1px solid rgba(15,15,15,0.08)',
                borderRadius: 14,
                padding: '28px 24px',
              }}>
                <div style={{ fontSize: 28, marginBottom: 14 }}>{item.icon}</div>
                <h3 style={{ fontSize: 17, letterSpacing: -0.3, marginBottom: 8, fontWeight: 500 }}>{item.title}</h3>
                <p style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.6)', lineHeight: 1.7, margin: 0 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FİYATLANDIRMA */}
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

      {/* SSS / FAQ */}
      <section style={{ padding: '80px 5vw' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(15,15,15,0.6)', marginBottom: 16, fontFamily: 'sans-serif' }}>Sıkça Sorulan Sorular</div>
          <h2 style={{ fontSize: 'clamp(28px, 3.5vw, 44px)', letterSpacing: -1.2, marginBottom: 40 }}>Aklındaki <em style={{ color: '#2d7a57' }}>sorular.</em></h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FAQS.map((faq, i) => {
              const isOpen = openFaq === i
              return (
                <div key={i} style={{
                  background: 'white',
                  border: isOpen ? '1.5px solid #2d7a57' : '1px solid rgba(15,15,15,0.1)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  transition: 'border-color 0.15s',
                }}>
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 16, padding: '18px 22px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: 15, letterSpacing: -0.2, fontWeight: isOpen ? 500 : 400, fontFamily: "'Georgia', serif" }}>{faq.q}</span>
                    <span style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                      border: '1.5px solid', borderColor: isOpen ? '#2d7a57' : 'rgba(15,15,15,0.2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, color: isOpen ? '#2d7a57' : 'rgba(15,15,15,0.4)',
                      transform: isOpen ? 'rotate(45deg)' : 'none',
                      transition: 'all 0.2s',
                    }}>+</span>
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 22px 20px' }}>
                      <p style={{ fontSize: 14, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.65)', lineHeight: 1.75, margin: 0 }}>{faq.a}</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: 36, padding: '24px 28px', background: 'white', borderRadius: 14, border: '1px solid rgba(15,15,15,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 15, letterSpacing: -0.2, marginBottom: 4 }}>Başka sorun mu var?</p>
              <p style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)', margin: 0 }}>info@simpleor.com adresinden bize ulaşabilirsin.</p>
            </div>
            <a href="mailto:info@simpleor.com" style={{ padding: '10px 22px', background: '#0f0f0f', color: '#f5f2ec', borderRadius: 8, fontSize: 13, textDecoration: 'none', fontFamily: 'sans-serif', fontWeight: 500, whiteSpace: 'nowrap' }}>
              İletişime Geç →
            </a>
          </div>
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

      {/* STICKY CTA */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
        background: 'rgba(15,15,15,0.97)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        padding: '14px 5vw',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
        transform: showSticky ? 'translateY(0)' : 'translateY(100%)',
        transition: 'transform 0.3s ease',
      }}>
        <div>
          <p style={{ fontSize: 14, fontFamily: 'sans-serif', color: 'rgba(255,255,255,0.9)', margin: 0, fontWeight: 500 }}>
            14 gün ücretsiz dene — kurulum yok, kredi kartı gerekmez
          </p>
          <p style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(255,255,255,0.4)', margin: '2px 0 0' }}>
            İstediğin zaman iptal · Başka bir yere ödeme yok
          </p>
        </div>
        <a href="#pricing" style={{
          padding: '11px 28px', background: '#2d7a57', color: 'white',
          borderRadius: 8, fontSize: 14, textDecoration: 'none', fontFamily: 'sans-serif', fontWeight: 600,
          whiteSpace: 'nowrap', flexShrink: 0,
        }}>
          Hemen Başla →
        </a>
      </div>

      {/* Sticky CTA için alt boşluk */}
      {showSticky && <div style={{ height: 70 }} />}

    </div>
  )
}
