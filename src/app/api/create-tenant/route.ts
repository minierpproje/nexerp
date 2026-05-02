import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY)

function generatePassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(req: NextRequest) {
  const { name, slug, email, modules } = await req.json()

  // Bu email zaten bir tenanta bağlıysa reddet
  const { data: existingTenant } = await supabaseAdmin
    .from('tenants').select('id').eq('owner_email', email).maybeSingle()
  if (existingTenant) {
    return NextResponse.json({ ok: false, error: 'Bu e-posta adresi zaten bir müşteriye ait.' }, { status: 400 })
  }

  const password = generatePassword()

  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  })

  if (createError) {
    return NextResponse.json({ ok: false, error: createError.message }, { status: 400 })
  }

  const userId = userData.user.id

  await supabaseAdmin.from('profiles').upsert({
    id: userId,
    full_name: name,
    role: 'tenant_owner',
  })

  const { error: tenantError } = await supabaseAdmin.from('tenants').insert({
    slug,
    name,
    owner_id: userId,
    owner_email: email,
    module: modules[0],
    modules,
    status: 'trial',
  })

  if (tenantError) {
    await supabaseAdmin.auth.admin.deleteUser(userId)
    return NextResponse.json({ ok: false, error: tenantError.message }, { status: 400 })
  }

  const loginUrl = `https://nexerp.orderp.xyz/${slug}/login`

  await resend.emails.send({
    from: 'SimpleORder <noreply@orderp.xyz>',
    to: email,
    subject: 'SimpleORder — Hesabınız Hazır',
    text: `Merhaba,\n\nSimpleORder hesabınız oluşturuldu.\n\nGiriş adresi: ${loginUrl}\nE-posta: ${email}\nŞifre: ${password}\n\nGüvenliğiniz için ilk girişten sonra şifrenizi değiştirmenizi öneririz.`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 32px;">
        <h2 style="font-size: 22px; margin-bottom: 8px;">SimpleORder</h2>
        <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Hesabınız oluşturuldu, giriş yapabilirsiniz.</p>
        <div style="background: #f5f2ec; border-radius: 10px; padding: 20px; font-size: 14px; margin-bottom: 24px;">
          <div style="margin-bottom: 10px;"><strong>Giriş adresi:</strong><br/>
            <a href="${loginUrl}" style="color: #2d7a57;">${loginUrl}</a>
          </div>
          <div style="margin-bottom: 10px;"><strong>E-posta:</strong> ${email}</div>
          <div><strong>Şifre:</strong> <span style="font-family: monospace; background: #e8e4dc; padding: 2px 6px; border-radius: 4px;">${password}</span></div>
        </div>
        <p style="font-size: 12px; color: #aaa;">Güvenliğiniz için ilk girişten sonra şifrenizi değiştirmenizi öneririz.</p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
