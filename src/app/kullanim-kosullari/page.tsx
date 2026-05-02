import Link from 'next/link'

export default function KullanimKosullariPage() {
  return (
    <div style={{ fontFamily: "'Georgia', serif", background: '#f0f0f0', minHeight: '100vh', color: '#0f0f0f' }}>
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(240,240,240,0.92)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(15,15,15,0.1)', padding: '0 5vw', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ fontSize: 20, letterSpacing: -0.5, textDecoration: 'none', color: '#0f0f0f' }}>Simple<span style={{ color: '#2d7a57' }}>OR</span>der</Link>
      </nav>

      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 5vw' }}>
        <h1 style={{ fontSize: 36, letterSpacing: -1, marginBottom: 8 }}>Kullanım Koşulları</h1>
        <p style={{ fontSize: 13, fontFamily: 'sans-serif', color: 'rgba(15,15,15,0.5)', marginBottom: 48 }}>Son güncelleme: Nisan 2026</p>

        {[
          {
            title: '1. Taraflar ve Kapsam',
            content: 'Bu kullanım koşulları, SimpleORder ("Platform") ile platforma kayıt olan bireysel veya kurumsal kullanıcılar ("Kullanıcı") arasındaki hukuki ilişkiyi düzenlemektedir. Platforma kayıt olarak veya platformu kullanarak bu koşulları kabul etmiş sayılırsınız.'
          },
          {
            title: '2. Hizmet Tanımı',
            content: 'SimpleORder, küçük ve orta ölçekli işletmelere yönelik modüler bir ERP (Kurumsal Kaynak Planlama) platformudur. Platform; bayi sipariş yönetimi, stok takibi ve ilgili iş süreçlerini dijitalleştirmeye yönelik araçlar sunmaktadır. Hizmetler SaaS (Software as a Service) modeliyle aylık abonelik ücreti karşılığında sunulmaktadır.'
          },
          {
            title: '3. Abonelik ve Ödeme',
            content: 'Platform, modül başına aylık ücretlendirme modeli ile çalışmaktadır. Abonelik ücretleri peşin olarak tahsil edilir. Ödeme yapılmaması durumunda hesap erişimi askıya alınabilir. Fiyatlar önceden bildirim yapılmak kaydıyla değiştirilebilir; mevcut abonelikler bildirim tarihinden sonraki ilk yenileme döneminden itibaren yeni fiyata tabi olur.'
          },
          {
            title: '4. Kullanıcı Yükümlülükleri',
            content: 'Kullanıcı; hesap bilgilerini gizli tutmakla, platforma yetkisiz erişim sağlamamakla, platformu yasa dışı amaçlarla kullanmamakla, başkalarının verilerine izinsiz erişmemekle ve platformun işleyişini bozacak eylemlerden kaçınmakla yükümlüdür. Bu koşulların ihlali halinde hesap askıya alınabilir veya sonlandırılabilir.'
          },
          {
            title: '5. Veri Sorumluluğu',
            content: 'Kullanıcı, platforma yüklediği verilerin doğruluğundan ve yasal uygunluğundan sorumludur. SimpleORder, kullanıcı verilerini yalnızca hizmet sunumu amacıyla işler; bu verilerin mülkiyeti kullanıcıya aittir. Abonelik sona erdiğinde kullanıcı verilerini dışa aktarma hakkına sahiptir.'
          },
          {
            title: '6. Hizmet Sürekliliği',
            content: 'SimpleORder, hizmetin kesintisiz ve hatasız çalışacağını garanti etmez. Planlı bakım çalışmaları önceden duyurulur. Beklenmedik kesintiler en kısa sürede giderilmeye çalışılır. Platform, hizmet kesintilerinden kaynaklanan doğrudan veya dolaylı zararlardan sorumlu tutulamaz.'
          },
          {
            title: '7. Fikri Mülkiyet',
            content: 'Platform yazılımı, tasarımı ve içeriğine ilişkin tüm fikri mülkiyet hakları SimpleORder\'a aittir. Kullanıcıya yalnızca platforma erişim ve kullanım hakkı tanınmaktadır; kaynak kodunu kopyalamak, dağıtmak veya türev ürün oluşturmak yasaktır.'
          },
          {
            title: '8. Hesap Kapatma',
            content: 'Kullanıcı dilediği zaman hesabını kapatabilir. Hesap kapatma işlemi mevcut abonelik döneminin sonunda geçerli olur; kalan süreye ait ücret iade edilmez. SimpleORder, koşulların ağır ihlali durumunda önceden bildirim yapmaksızın hesabı sonlandırma hakkını saklı tutar.'
          },
          {
            title: '9. Uygulanacak Hukuk',
            content: 'Bu koşullar Türk Hukuku\'na tabidir. Taraflar arasında doğacak uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.'
          },
          {
            title: '10. İletişim',
            content: 'Kullanım koşullarına ilişkin sorularınız için info@simpleor.com adresine ulaşabilirsiniz.'
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
