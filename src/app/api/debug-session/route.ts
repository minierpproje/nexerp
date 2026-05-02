import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const allCookies = req.cookies.getAll()
  const supabaseCookies = allCookies.filter(c => c.name.includes('supabase') || c.name.includes('sb-'))
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: () => {},
      }
    }
  )
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  return NextResponse.json({
    user_id: user?.id ?? null,
    user_email: user?.email ?? null,
    error: error?.message ?? null,
    cookie_count: allCookies.length,
    supabase_cookies: supabaseCookies.map(c => ({ name: c.name, length: c.value.length })),
  })
}
