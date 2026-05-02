import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 })

  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('slug', slug).eq('owner_id', session.user.id).single()
  if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data: categories } = await supabase
    .from('product_categories').select('*').eq('tenant_id', tenant.id).order('name')

  return NextResponse.json({ categories: categories || [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug, name } = await req.json()
  if (!slug || !name) return NextResponse.json({ error: 'slug and name required' }, { status: 400 })

  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('slug', slug).eq('owner_id', session.user.id).single()
  if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('product_categories')
    .insert({ tenant_id: tenant.id, name: name.trim() })
    .select().single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Bu kategori zaten var' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ category: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  const slug = req.nextUrl.searchParams.get('slug')
  if (!id || !slug) return NextResponse.json({ error: 'id and slug required' }, { status: 400 })

  const { data: tenant } = await supabase
    .from('tenants').select('id').eq('slug', slug).eq('owner_id', session.user.id).single()
  if (!tenant) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await supabase.from('product_categories').delete().eq('id', id).eq('tenant_id', tenant.id)

  return NextResponse.json({ ok: true })
}
