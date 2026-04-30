@AGENTS.md

# NexERP / SimpleORder — Proje Kılavuzu

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

**SCP veya SSH ile dosya kopyalamaya GEREK YOK.** Her iki site de GitHub'dan `git pull` yapıyor.

GitHub repo: `https://github.com/minierpproje/nexerp.git`

## Mimari

- **Next.js App Router** — `src/app/[tenant]/` altında tenant'a özel sayfalar
- **Supabase** — auth + veritabanı. RLS tüm tablolarda aktif, sunucu tarafında uygulanır
- Client sayfalar: `createClient()` from `@/lib/supabase/client`
- Server sayfalar: `createClient()` from `@/lib/supabase/server`
- Tenant slug'ı her zaman `useParams()` ile al, prop olarak geçirme

```tsx
// DOĞRU
const params = useParams()
const slug = params.tenant as string

// YANLIŞ — App Router'da params bir Promise
const { tenant } = params
```

## Sayfa Yapısı

```
src/app/
├── [tenant]/
│   ├── dashboard/page.tsx    # Tenant sipariş yönetimi (filtreler, kalem durum)
│   ├── dealers/page.tsx      # Bayi yönetimi (şubeler, fiyat, kota, ödeme)
│   ├── dealers/new/page.tsx  # Yeni bayi formu
│   ├── orders/page.tsx       # Bayi sipariş formu + sipariş listesi
│   ├── branches/page.tsx     # Bayi şube CRUD
│   ├── products/page.tsx     # Ürün listesi (dinamik kategori kolonları)
│   ├── products/new/page.tsx # Yeni ürün
│   ├── products/[id]/        # Ürün düzenle
│   ├── settings/page.tsx     # Tenant ayarları
│   ├── crm/page.tsx          # CRM müşteri listesi
│   ├── stock/page.tsx        # Stok yönetimi
│   ├── login/page.tsx        # Tenant'a özel giriş
│   └── branches/page.tsx     # Bayi şubeleri
├── dashboard/page.tsx        # Super admin paneli
├── login/page.tsx            # Akıllı yönlendirme (dealer/tenant/admin)
├── register/page.tsx         # Tenant kayıt
└── api/                      # Route handlers
```

## Veritabanı Şeması

### Temel Tablolar
```sql
tenants         -- id, slug, name, owner_id, owner_email, modules(text[]),
                --   status, notification_email, stock_integrated, hide_base_price
profiles        -- id, tenant_id, full_name, role, is_super_admin
dealers         -- id, tenant_id, code, name, email, phone, region,
                --   payment_terms, status, category_id
dealer_products -- id, tenant_id, code, name, category, category_data(JSONB),
                --   unit, base_price, vat_rate, status, stock_quantity
orders          -- id, tenant_id, dealer_id, branch_id, order_no, status,
                --   note, subtotal, vat_amount, total, delivery_date, created_at
order_items     -- id, order_id, product_id, quantity, unit_price,
                --   vat_rate, line_total, status
```

### Bayi Yönetimi Tabloları
```sql
dealer_branches       -- id, tenant_id, dealer_id, name, address,
                      --   contact_person, phone
dealer_categories     -- id, tenant_id, name, rules(JSONB), created_at
                      -- rules: { total_quota: {value, unit},
                      --          product_quotas: [{product_id, product_name, unit, value}],
                      --          amount_quota: number }
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
crm_customers   -- id, tenant_id, name, contact, phone, email, notes,
                --   address, district, city, created_at
activity_firms, activity_logs, activity_rates, activity_takip
```

## Modül Sistemi

Desteklenen modüller: `dealer_orders` · `stock` · `aktivite` · `crm` · `gider`

Yeni modül eklenince şu 5 dosyada güncelleme gerekir:
1. `src/app/page.tsx` — landing page modül listesi
2. `src/app/register/page.tsx` — kayıt formu
3. `src/app/[tenant]/dashboard/page.tsx` — nav linkleri
4. `src/app/[tenant]/settings/page.tsx` — ayarlar koşulları
5. İlgili modül sayfası

## Kullanıcı Rolleri ve Login Akışı

```
/login (akıllı yönlendirme)
  ├── Dealer    → profiles.tenant_id → tenants.slug → /{slug}/orders
  ├── Tenant    → tenants.owner_id   → tenants.slug → /{slug}/dashboard  (veya /{slug})
  └── SuperAdmin→ /dashboard
```

- Pasif dealer (`status !== 'ACTIVE'`) → orders sayfasında 🔒 ekranı
- Tenant sahibi kontrolü: `tenantData.owner_id !== user.id`
- Dealer kimliği: `dealers` tablosunda `email = user.email` eşleşmesi

## Supabase Sorgu Kalıpları

### Yeni tablo join'i eklenince fallback kullan
```tsx
let { data, error } = await supabase
  .from('orders')
  .select('*, dealers(name), dealer_branches(name)')
  .eq('tenant_id', tenantId)
if (error) {
  // Tablo henüz yoksa sessizce düş
  const { data: fallback } = await supabase
    .from('orders').select('*, dealers(name)')
    .eq('tenant_id', tenantId)
  data = fallback
}
```

### RLS politikası yapısı (tüm tablolarda benzer)
```sql
-- Tenant sahibi tam erişim
CREATE POLICY owner_access ON tablo_adi FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Bayi sadece kendi kayıtlarını okuyabilir
CREATE POLICY dealer_select ON tablo_adi FOR SELECT
  USING (dealer_id IN (SELECT id FROM dealers WHERE email = auth.email()));
```

## UI Tasarım Sistemi

**Renkler:**
- Arkaplan: `#f5f2ec`
- Kart/panel: `white`, border `1px solid rgba(15,15,15,0.1)`, borderRadius `12`
- Ana yeşil (marka): `#2d7a57`
- Metin: `#0f0f0f` (koyu), `#374151` (normal), `#666` (soluk), `#888` (yer tutucu)

**Durum rozetleri:**
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

**Geri butonu standart stili:**
```tsx
style={{ display:'inline-flex', alignItems:'center', gap:6,
  padding:'6px 14px', background:'rgba(15,15,15,0.07)',
  border:'none', borderRadius:8, fontSize:13,
  color:'#374151', fontWeight:500, cursor:'pointer' }}
```

**Başlık fontları:** `fontFamily: 'Georgia, serif'`

**Branding:** `Simple<span style={{ color: '#2d7a57' }}>OR</span>der`

## Önemli Özellikler

### Bayi Sipariş Formu (orders/page.tsx)
- Kademeli kategori filtreleri (level N açılmadan level N+1 gelmez)
- Sepet: +/- butonu + yazarak adet girişi
- Teslimat şubesi seçimi + randevulu teslimat (checkbox + tarih)
- `hideBasePrice` ayarı: özel fiyatı varsa standart fiyat gizlenir
- Üst özet kart: açık borç + kota bar grafikleri

### Bayi Yönetimi (dealers/page.tsx)
- Expand ile 3 sekme: **Şubeler** | **Özel Fiyatlar** | **Kota & Ödeme**
- Kategori kuralları: toplam kota, ürün bazlı kota, tutar kotası
- Ödeme ekleme → `dealer_payments` tablosuna kaydedilir
- Bakiye sütunu: açık siparişler − ödemeler

### Dashboard (dashboard/page.tsx)
- Filtreler: bayi, durum, tarih aralığı
- Expand ile kalem detayı + kalem bazlı durum güncelleme
- Stok entegrasyonu: CONFIRMED → stok düşer, CANCELLED → stok geri yüklenir

### Ayarlar (settings/page.tsx)
- `stock_integrated`: sipariş onaylanınca otomatik stok düşme
- `hide_base_price`: bayiler standart fiyatı göremez (dealer_orders modülü gerekir)

## Mail Sistemi

- Resend API Key: `re_XCXLQYFf_...`
- nexerp: `noreply@orderp.xyz`
- simpleor: `noreply@simpleor.com` (simpleor.com Resend'de verify edilmeli)

## Bekleyen SQL (Her İki Supabase'de Çalıştırılacak)

```sql
-- Şube + teslimat
CREATE TABLE IF NOT EXISTS dealer_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  name text NOT NULL, address text, contact_person text, phone text
);
ALTER TABLE dealer_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS branch_id uuid REFERENCES dealer_branches(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_date date;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING';

-- Bayi kategorileri
CREATE TABLE IF NOT EXISTS dealer_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL, rules jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE dealer_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_access ON dealer_categories FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
ALTER TABLE dealers ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES dealer_categories(id);

-- Özel fiyatlar
CREATE TABLE IF NOT EXISTS dealer_product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES dealer_products(id) ON DELETE CASCADE,
  price numeric NOT NULL, created_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, dealer_id, product_id)
);
ALTER TABLE dealer_product_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_access ON dealer_product_prices FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
CREATE POLICY dealer_select ON dealer_product_prices FOR SELECT
  USING (dealer_id IN (SELECT id FROM dealers WHERE email = auth.email()));

-- Ödemeler
CREATE TABLE IF NOT EXISTS dealer_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  dealer_id uuid REFERENCES dealers(id) ON DELETE CASCADE,
  amount numeric NOT NULL, note text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE dealer_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY owner_access ON dealer_payments FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));

-- Ayarlar
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS hide_base_price boolean DEFAULT false;

-- Ürün kategori hiyerarşisi (RLS güncellemesi)
DROP POLICY IF EXISTS owner_access ON product_category_levels;
DROP POLICY IF EXISTS owner_access ON product_category_values;
CREATE POLICY select_access ON product_category_levels FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY write_access ON product_category_levels FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
CREATE POLICY select_access ON product_category_values FOR SELECT
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid())
    OR tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY write_access ON product_category_values FOR ALL
  USING (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()))
  WITH CHECK (tenant_id IN (SELECT id FROM tenants WHERE owner_id = auth.uid()));
```
