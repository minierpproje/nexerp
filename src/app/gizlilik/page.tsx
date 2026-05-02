import Link from 'next/link'

export default function GizlilikPage() {
  return (
    <div style={{ fontFamily: "'Georgia', serif", background: '#f0f0f0', minHeight: '100vh', color: '#0f0f0f' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(240,240,240,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(15,15,15,0.1)', padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 20, letterSpacing: -0.5, textDecoration: 'none', color: '#0f0f0f' }}>Simple<span style={{ color: '#2d7a57' }}>OR</span>der</Link>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 5vw' }}>
        <h1 style={{ fontSize: 36, letterSpacing: -1, marginBottom: 8 }}>Gizlilik Politikası</h1>
        <p style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)', marginBottom: 48 }}>Son güncelleme: Nisan 2026</p>

        {[
          {
            title: '1. Toplanan Veriler',
            content: 'SimpleORder, hizmet sunabilmek için aşağıdaki kişisel verileri toplamaktadır: ad-soyad, e-posta adresi, telefon numarası (isteğe bağlı), şirket/işletme adı ve fatura bilgileri. Ayrıca platform kullanımına ilişkin teknik veriler (IP adresi, tarayıcı türü, oturum süresi) otomatik olarak kaydedilebilir.'
          },
          {
            title: '2. Verilerin Kullanımı',
            content: 'Toplanan veriler; hesap oluşturma ve kimlik doğrulama, hizmet bildirimleri ve fatura e-postaları gönderme, platform güvenliğini sağlama, hizmet kalitesini iyileştirme ve yasal yükümlülüklerin yerine getirilmesi amacıyla kullanılmaktadır. Verileriniz hiçbir koşulda üçüncü taraflara satılmamaktadır.'
          },
          {
            title: '3. Veri Güvenliği',
            content: 'Verileriniz, endüstri standardı güvenlik önlemleriyle korunmaktadır. Tüm iletişim SSL/TLS şifrelemesi ile sağlanmakta; veritabanı erişimleri rol tabanlı yetkilendirme ile kısıtlanmaktadır. Supabase altyapısı üzerinde saklanan veriler, SOC 2 Type II sertifikalı veri merkezlerinde barındırılmaktadır.'
          },
          {
            title: '4. Veri Saklama Süresi',
            content: 'Aktif hesaplara ait veriler, abonelik süresi boyunca saklanır. Hesap kapatma talebinden itibaren veriler 30 gün içinde sistemden kalıcı olarak silinir. Yasal zorunluluk bulunan veriler ilgili mevzuat kapsamında belirtilen süreler boyunca muhafaza edilebilir.'
          },
          {
            title: '5. Kullanıcı Hakları',
            content: 'KVKK (6698 sayılı Kanun) kapsamında; verilerinize erişim talep etme, hatalı verilerin düzeltilmesini isteme, verilerinizin silinmesini talep etme ve veri işleme faaliyetlerine itiraz etme haklarına sahipsiniz. Bu haklarınızı kullanmak için info@simpleor.com adresine başvurabilirsiniz.'
          },
          {
            title: '6. Çerezler',
            content: 'Platform, oturum yönetimi için zorunlu çerezler kullanmaktadır. Bu çerezler kullanıcının oturum açık kalması için gereklidir ve kişisel veri içermez. Üçüncü taraf analitik veya reklam çerezleri kullanılmamaktadır.'
          },
          {
            title: '7. İletişim',
            content: 'Gizlilik politikamıza ilişkin sorularınız için info@simpleor.com adresine e-posta gönderebilirsiniz. Talepleriniz en geç 30 iş günü içinde yanıtlanacaktır.'
          },
        ].map(section => (
          <div key={section.title} style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 18, marginBottom: 12, letterSpacing: -0.3 }}>{section.title}</h2>
            <p style={{ fontSize: 15, fontFamily: 'sans-serif', lineHeight: 1.8, color: 'rgba(15,15,15,0.7)' }}>{section.content}</p>
          </div>
        ))}
      </div>

      <footer style={{ borderTop: '1px solid rgba(15,15,15,0.1)', padding: '24px 5vw', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 15 }}>Simple<span style={{ color: '#2d7a57' }}>OR</span>der</div>
        <p style={{ fontSize: 12, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.4)' }}>© 2026 SimpleORder</p>
      </footer>
    </div>
  )
}
