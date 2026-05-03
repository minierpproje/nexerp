@AGENTS.md

# SimpleORder — Proje Kılavuzu

## Ortamlar

| Site | URL | Port | Supabase | Amaç |
|---|---|---|---|---|
| nexerp | nexerp.orderp.xyz | 3001 | vsxymimvlatqnfjaisdy.supabase.co | DEV |
| simpleor | simpleor.com | 3004 | ebqrnoqvkxyzpdrajdeq.supabase.co | PROD |

- Sunucu: AWS Lightsail, Ubuntu, IP `63.183.196.143`
- SSH key: `C:\Users\OMER METO\Downloads\LightsailDefaultKey-eu-central-1.pem`
- Nginx + PM2 + Node.js 20 + SSL (Certbot)

## Deploy Akışı

```
1. Lokal'de kodu değiştir
2. git add && git commit && git push
3. Telegram bota yaz: "güncelle"
```

Bot komutları: `güncelle` (DEV+PROD) · `dev` (sadece nexerp) · `prod` (sadece simpleor) · `durum` · `log` · `log prod`

GitHub repo: `https://github.com/minierpproje/nexerp.git`

## Mimari

- **Next.js App Router** — `src/app/[tenant]/` altında tenant'a özel sayfalar
- **Supabase** — auth + veritabanı. RLS tüm tablolarda aktif
- Client: `createClient()` from `@/lib/supabase/client`
- Server: `createClient()` from `@/lib/supabase/server`
- Tenant slug: her zaman `useParams()` ile al → `const slug = params.tenant as string`

## Sayfa Yapısı

```
src/app/
├── [tenant]/
│   ├── layout.tsx            # Sticky navbar: SimpleORder logo + çıkış butonu
│   ├── page.tsx              # Tenant hub — modül seçim ekranı (her girişte gösterilir)
│   ├── dashboard/page.tsx    # Tenant sipariş yönetimi (filtreler, kalem durum, toplam tutar kartı)
│   ├── dealers/page.tsx      # Bayi yönetimi (şubeler, fiyat, kota, ödeme, vade)
│   ├── dealers/new/page.tsx  # Yeni bayi formu
│   ├── orders/page.tsx       # Bayi sipariş formu + sipariş listesi
│   ├── branches/page.tsx     # Bayi şube CRUD
│   ├── products/page.tsx     # Ürün listesi (dinamik kategori kolonları, CategoryButton)
│   ├── products/new/page.tsx # Yeni ürün (kategori seçimi dahil)
│   ├── products/[id]/edit/   # Ürün düzenle
│   ├── products/CategoryButton.tsx  # Ürün hiyerarşisi modal
│   ├── settings/page.tsx     # Tenant ayarları
│   ├── crm/page.tsx          # CRM müşteri listesi (Excel import/export)
│   ├── stock/page.tsx        # Stok yönetimi
│   ├── gider/page.tsx        # Gider takip
│   ├── aktivite/page.tsx     # Aktivite yönetimi
│   ├── onboard/page.tsx      # Onboarding
│   ├── profile/page.tsx      # Profil
│   └── login/page.tsx        # Tenant'a özel giriş (akıllı yönlendirme)
├── dashboard/page.tsx        # Super admin paneli
├── admin/page.tsx            # Admin sayfası
├── login/page.tsx            # Ana giriş (akıllı yönlendirme)
├── register/page.tsx         # Tenant kayıt (?modules= param okur)
├── page.tsx                  # Landing page (accordion modüller, fiyatlandırma)
└── api/
    ├── register-tenant/      # Tenant kaydı (modules[] alır)
    ├── invite-dealer/        # Bayi davet + mail
    ├── add-module/           # Modül ekleme (tüm 5 modülü destekler)
    ├── categories/           # Kategori API
    ├── notify-tenant/        # Bildirim
    └── admin/                # Admin işlemleri
```

## Veritabanı Şeması

### Temel Tablolar
```sql
tenants         -- id, slug, name, owner_id, owner_email, modules(text[]),
                --   status, notification_email, stock_integrated, hide_base_price
profiles        -- id, tenant_id, full_name, role, is_super_admin
dealers         -- id, tenant_id, code, name, email, phone, region,
                --   payment_terms(int, gün), status, category_id
dealer_products -- id, tenant_id, code, name, category, category_data(JSONB),
                --   unit, base_price, vat_rate, status, stock_quantity
orders          -- id, tenant_id, dealer_id, branch_id, order_no, status,
                --   note, subtotal, vat_amount, total, delivery_date, created_at,
                --   payment_status(text), payment_received(numeric)
order_items     -- id, order_id, product_id, quantity, unit_price,
                --   vat_rate, line_total, status
```

### Bayi Yönetimi Tabloları
```sql
dealer_branches       -- id, tenant_id, dealer_id, name, address, contact_person, phone
dealer_categories     -- id, tenant_id, name, rules(JSONB), created_at
                      -- rules: { total_quota:{value,unit}, product_quotas:[...], amount_quota:number }
dealer_product_prices -- id, tenant_id, dealer_id, product_id, price
                      -- UNIQUE(tenant_id, dealer_id, product_id)
dealer_payments       -- id, tenant_id, dealer_id, amount, note, created_at
```

### Kategori Hiyerarşisi
```sql
product_category_levels -- id, tenant_id, name, sort_order
product_category_values -- id, tenant_id, level_id, name
```

### Diğer Modüller
```sql
crm_customers   -- id, tenant_id, name, contact, phone, email, notes, address, district, city
activity_firms, activity_logs, activity_rates, activity_takip
```

## Modül Sistemi

Desteklenen modüller (sıralı): `dealer_orders` · `stock` · `crm` · `gider` · `aktivite`

İsimler: Bayi Sipariş Yönetimi · Stok Yönetimi · Müşteri Bilgileri Yönetimi · Gider Takip Yönetimi · Aktivite Yönetimi

Fiyat: ₺790/ay ilk modül, +₺100/ay her ek modül

Yeni modül eklenince şu 5 dosyada güncelleme gerekir:
1. `src/app/page.tsx` — landing page MODULES dizisi
2. `src/app/register/page.tsx` — MODULE_NAMES
3. `src/app/[tenant]/page.tsx` — MODULE_META + ALL_MODULES
4. `src/app/[tenant]/dashboard/page.tsx` — nav linkleri
5. `src/app/api/add-module/route.ts` — VALID_MODULES dizisi

## Kullanıcı Rolleri ve Login Akışı

```
/login veya /{slug}/login
  ├── Super Admin  → NEXT_PUBLIC_SUPER_ADMIN_EMAIL env veya is_super_admin flag → /dashboard
  ├── Tenant       → tenants.owner_id → /{slug}  (hub/modül seçim ekranı)
  └── Dealer       → profiles.tenant_id veya dealers.email → /{slug}/orders
                     (yanlış tenant'a girişe izin verilmez)
```

- Pasif dealer → orders sayfasında 🔒 ekranı + çıkış → `/`
- Tüm çıkışlar `/` anasayfaya yönlendirir
- Super admin email: `NEXT_PUBLIC_SUPER_ADMIN_EMAIL` env var (her iki .env.local'de tanımlı)

## Önemli Özellikler

### Bayi Sipariş Formu (orders/page.tsx)
- Kademeli kategori filtreleri (level N açılmadan N+1 gelmez)
- Sepet: +/- butonu + yazarak adet girişi
- Teslimat şubesi seçimi + randevulu teslimat
- `hideBasePrice`: özel fiyatı varsa standart fiyat gizlenir
- **Özet kart (kota VARSA):** Toplam Sipariş Tutarı + kota bar grafikleri
- **Özet kart (kota YOKSA):** Açık Siparişler + Toplam Ödeme + Net Borç/Alacak

### Bayi Yönetimi (dealers/page.tsx)
- Expand ile 3 sekme: **Şubeler** | **Özel Fiyatlar** | **Kota & Ödeme**
- Vade (gün) sütunu: inline düzenlenebilir, blur'da kaydedilir
- **Kota & Ödeme sekmesi:**
  - Kotalı bayiler: kota barları
  - Kotasız bayiler: Siparişler & Vade tablosu (sipariş no, sipariş tarihi, vade tarihi, tutar, ödeme durumu, ödenen/kalan)
  - Ödeme formu: tutar + sipariş seçici (belirli sipariş veya otomatik dağıtım) + not
  - Ödeme girilince eskiden yeniye dağıtım: PAID → PARTIAL → LATE/PENDING
  - `payment_status` değerleri: PAID · PARTIAL · LATE · PENDING
  - `payment_received`: o siparişe yapılan ödeme miktarı

### Dashboard (dashboard/page.tsx)
- 4 kart: Toplam Sipariş · Bekleyen Onay · Aktif Bayi · Toplam Sipariş Tutarı (₺)
- Filtreler: bayi, durum, tarih aralığı
- Expand ile kalem detayı + kalem bazlı durum güncelleme
- Stok entegrasyonu: CONFIRMED → stok düşer, CANCELLED → stok geri yüklenir

### Ürün Yönetimi (products/)
- `CategoryButton.tsx`: level/value CRUD modal (sürükle-bırak sıralama)
- Ürün listesi: tenant'ın level isimlerine göre dinamik kolonlar
- Yeni/düzenle: level bazlı dropdown (mevcut değerler + "Yeni ekle...")
- `category_data` JSONB: `{ levelId: valueName }` formatında kaydedilir

### Tenant Hub (page.tsx)
- Her girişte modül seçim ekranı (localStorage auto-redirect kaldırıldı)
- `+ Modül Ekle` butonu: mevcut olmayan modülleri ekler

### Landing Page (src/app/page.tsx)
- Accordion modüller: tıklayınca açıklama + video alanı
- Fiyatlandırma: kapsül (pill) stili, ₺790 ilk / +₺100 ek
- Kayıt → `/register?modules=dealer_orders,stock` formatında

## UI Tasarım Sistemi

- Arkaplan: `#f5f2ec` · Kart border: `1px solid rgba(15,15,15,0.1)` · borderRadius: `12`
- Marka yeşili: `#2d7a57` · Georgia, serif başlıklar
- Branding: `Simple<span style={{ color: '#2d7a57' }}>OR</span>der`
- Layout navbar: `background: rgba(245,242,236,0.96)`, height 52px, sticky

**Durum rozetleri (sipariş):**
```tsx
const statusColor = {
  PENDING:    { bg: '#fdf3e0', color: '#b87d1a' },
  CONFIRMED:  { bg: '#e8f0fb', color: '#2563a8' },
  PROCESSING: { bg: '#f3e8ff', color: '#6b21a8' },
  SHIPPED:    { bg: '#e0f2fe', color: '#0c4a6e' },
  DELIVERED:  { bg: '#f0fdf4', color: '#16a34a' },
  CANCELLED:  { bg: '#fef2f2', color: '#dc2626' },
}
```

**Ödeme durumu rozetleri:**
```tsx
const psColors = {
  PAID:    { bg: '#f0fdf4', color: '#16a34a', label: 'Ödeme Alındı' },
  PARTIAL: { bg: '#fefce8', color: '#ca8a04', label: 'Kısmi Ödeme' },
  LATE:    { bg: '#fef2f2', color: '#dc2626', label: 'Ödeme Gecikti' },
  PENDING: { bg: '#fdf3e0', color: '#b87d1a', label: 'Bekliyor' },
}
```

**Geri butonu:**
```tsx
style={{ display:'inline-flex', alignItems:'center', gap:6,
  padding:'6px 14px', background:'rgba(15,15,15,0.07)',
  border:'none', borderRadius:8, fontSize:13, color:'#374151', fontWeight:500 }}
```

## Mail Sistemi

- Resend API Key: `re_XCXLQYFf_...` (`.env.local`'de)
- nexerp: `noreply@orderp.xyz` · simpleor: `noreply@simpleor.com`
- Bayi daveti: `/api/invite-dealer` → kullanıcı oluşturur + mail gönderir + `dealer_payments` kaydeder

## Supabase SQL Çalıştırma

Token'lar `C:\Users\OMER METO\nexerp\.env.local.txt`:
- `SUPABASE_MANAGEMENT_TOKEN_DEV` → vsxymimvlatqnfjaisdy
- `SUPABASE_MANAGEMENT_TOKEN_PROD` → ebqrnoqvkxyzpdrajdeq

```bash
curl -s -X POST "https://api.supabase.com/v1/projects/{ref}/database/query" \
  -H "Authorization: Bearer {token}" -H "Content-Type: application/json" \
  -d '{"query":"SQL_BURAYA"}'
```

Önce DEV'de çalıştır, doğrula, sonra PROD'a uygula.
