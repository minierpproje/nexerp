'use client'

import Link from 'next/link'

type NavItem = { key: string; label: string; href: string; module?: string }

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Siparişler', href: 'dashboard', module: 'dealer_orders' },
  { key: 'dealers',   label: 'Bayiler',     href: 'dealers',   module: 'dealer_orders' },
  { key: 'stock',     label: 'Stoklar',     href: 'stock',     module: 'stock' },
  { key: 'products',  label: 'Ürünler',     href: 'products',  module: 'dealer_orders' },
  { key: 'crm',       label: 'CRM',         href: 'crm',       module: 'crm' },
  { key: 'reports',   label: 'Raporlar',    href: 'reports' },
  { key: 'settings',  label: 'Ayarlar',     href: 'settings' },
]

export default function TenantSidebar({ slug, modules, pathname }: { slug: string; modules: string[]; pathname: string }) {
  const activeSection = (pathname || '').split('/').filter(Boolean)[1] || ''

  const linkStyle = (active: boolean) => ({
    display: 'block' as const,
    padding: '9px 14px',
    borderRadius: 8,
    fontSize: 14,
    textDecoration: 'none' as const,
    color: active ? '#0f0f0f' : '#555',
    background: active ? '#f5f2ec' : 'transparent',
    fontWeight: active ? 600 : 400,
  })

  return (
    <div style={{
      width: 212,
      flexShrink: 0,
      background: 'white',
      borderRight: '1px solid rgba(15,15,15,0.08)',
      padding: '20px 12px',
      position: 'sticky',
      top: 52,
      height: 'calc(100vh - 52px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
    }}>
      <Link href={`/${slug}/ozet`} style={linkStyle(activeSection === 'ozet')}>
        Özet
      </Link>

      <div style={{ fontSize: 11, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '16px 14px 8px' }}>
        Dashboard
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.filter(item => !item.module || modules.includes(item.module)).map(item => (
          <Link key={item.key} href={`/${slug}/${item.href}`} style={linkStyle(activeSection === item.href)}>
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
