import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { tenantId, newEmail } = await req.json()

  const { data: tenant, error: fetchError } = await supabaseAdmin
    .from('tenants').select('owner_id').eq('id', tenantId).single()

  if (fetchError || !tenant) {
    return NextResponse.json({ ok: false, error: 'Tenant bulunamadı.' }, { status: 404 })
  }

  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
    tenant.owner_id,
    { email: newEmail, email_confirm: true }
  )

  if (authError) {
    return NextResponse.json({ ok: false, error: authError.message }, { status: 400 })
  }

  await supabaseAdmin.from('tenants').update({ owner_email: newEmail }).eq('id', tenantId)

  return NextResponse.json({ ok: true })
}
