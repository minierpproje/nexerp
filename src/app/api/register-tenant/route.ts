import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { userId, slug, name, email, modules } = await req.json()

  if (!userId || !slug || !modules?.length) {
    return NextResponse.json({ ok: false, error: 'Eksik parametre.' }, { status: 400 })
  }

  const { data: existing } = await supabaseAdmin
    .from('tenants').select('id').eq('slug', slug).maybeSingle()
  if (existing) {
    return NextResponse.json({ ok: false, error: 'Bu URL adı zaten alınmış, başka bir tane deneyin.' }, { status: 400 })
  }

  const { error } = await supabaseAdmin.from('tenants').insert({
    slug,
    name,
    owner_id: userId,
    owner_email: email,
    module: modules[0],
    modules,
    status: 'trial',
  })

  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
