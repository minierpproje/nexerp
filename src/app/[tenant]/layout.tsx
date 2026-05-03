'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient()
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLoggedIn(!!data.session)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <>
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(245,242,236,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(15,15,15,0.08)',
        padding: '0 32px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <Link href="/" style={{ fontFamily: 'Georgia, serif', fontSize: 18, letterSpacing: -0.5, textDecoration: 'none', color: '#0f0f0f' }}>
          Simple<span style={{ color: '#2d7a57' }}>OR</span>der
        </Link>
        {loggedIn && (
          <button onClick={handleSignOut} style={{
            padding: '6px 14px', background: 'transparent',
            border: '1px solid rgba(15,15,15,0.15)', borderRadius: 8,
            fontSize: 13, cursor: 'pointer', color: '#666',
          }}>
            Çıkış
          </button>
        )}
      </div>
      {children}
    </>
  )
}
