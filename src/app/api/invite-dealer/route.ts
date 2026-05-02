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

function normalizeName(s: string): string {
  return s.toUpperCase()
    .replace(/Ğ/g, 'G').replace(/Ü/g, 'U').replace(/Ş/g, 'S')
    .replace(/İ/g, 'I').replace(/Ö/g, 'O').replace(/Ç/g, 'C')
    .replace(/[^A-Z]/g, '')
}

async function generateDealerCode(name: string, tenantId: string): Promise<string> {
  const norm = normalizeName(name)
  const base = norm.substring(0, 2).padEnd(2, 'X')

  const { data: existing } = await supabaseAdmin
    .from('dealers').select('code').eq('tenant_id', tenantId)

  const codes = (existing || []).map(d => d.code || '')

  // Prefix = ilk 2 harf sabit, 3. harf ismin 3,4,5... harflerinden çakışmayan ilk
  let prefix = base + (norm[2] || 'X')
  for (let i = 2; i < norm.length && i < 8; i++) {
    const candidate = base + norm[i]
    if (!codes.some(c => c.startsWith(candidate + '-'))) {
      prefix = candidate
      break
    }
    prefix = candidate
  }

  const count = codes.filter(c => c.startsWith(prefix + '-')).length
  return `${prefix}-${String(count + 1).padStart(3, '0')}`
}

export async function POST(req: NextRequest) {
  const { email, name, slug, tenantId, tenantName } = await req.json()

  const password = generatePassword()

  const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name, role: 'dealer' },
  })

  if (createError) {
    return NextResponse.json({ ok: false, error: createError.message }, { status: 400 })
  }

  await supabaseAdmin.from('profiles').upsert({
    id: userData.user.id,
    full_name: name,
    tenant_id: tenantId,
    role: 'dealer',
  })

  const code = await generateDealerCode(name, tenantId)

  const { error: dealerError } = await supabaseAdmin.from('dealers').insert({
    tenant_id: tenantId,
    name,
    code,
    email,
    status: 'ACTIVE',
  })

  if (dealerError) {
    await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
    return NextResponse.json({ ok: false, error: 'Bayi kaydı oluşturulamadı: ' + dealerError.message }, { status: 400 })
  }

  const host = req.headers.get('host') || 'simpleor.com'
  const proto = host.includes('localhost') ? 'http' : 'https'
  const loginUrl = `${proto}://${host}/login`
  const fromEmail = host.includes('simpleor.com') ? 'SimpleORder <noreply@simpleor.com>' : 'SimpleORder <noreply@orderp.xyz>'

  await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: `${tenantName} — Bayi Hesabınız Hazır`,
    text: `Merhaba ${name},\n\n${tenantName} üzerinden bayi hesabınız oluşturuldu.\n\nGiriş adresi: ${loginUrl}\nE-posta: ${email}\nŞifre: ${password}\n\nGüvenliğiniz için ilk girişten sonra şifrenizi değiştirmenizi öneririz.`,
    html: `
      <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 32px;">
        <h2 style="font-size: 22px; margin-bottom: 8px;">${tenantName}</h2>
        <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Merhaba ${name}, bayi hesabınız oluşturuldu.</p>
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
