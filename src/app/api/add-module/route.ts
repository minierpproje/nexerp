import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_MODULES = ['dealer_orders', 'stock', 'crm', 'gider', 'aktivite']

export async function POST(req: NextRequest) {
  const { tenantId, module } = await req.json()
  if (!tenantId || !module || !VALID_MODULES.includes(module)) {
    return NextResponse.json({ ok: false, error: 'Geçersiz istek.' }, { status: 400 })
  }

  const { data: tenant, error: fetchErr } = await supabaseAdmin
    .from('tenants').select('modules').eq('id', tenantId).single()
  if (fetchErr || !tenant) {
    return NextResponse.json({ ok: false, error: 'Tenant bulunamadı.' }, { status: 404 })
  }

  const current: string[] = tenant.modules || []
  if (current.includes(module)) {
    return NextResponse.json({ ok: false, error: 'Modül zaten aktif.' }, { status: 400 })
  }

  const updated = [...current, module]
  const { error } = await supabaseAdmin
    .from('tenants').update({ modules: updated, module: updated[0] }).eq('id', tenantId)

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, modules: updated })
}
