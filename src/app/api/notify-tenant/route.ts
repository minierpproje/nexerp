import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  const { slug, dealerName, dealerEmail } = await req.json()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('name, notification_email')
    .eq('slug', slug)
    .single()

  if (!tenant?.notification_email) {
    return NextResponse.json({ ok: false, reason: 'notification_email yok' })
  }

  await resend.emails.send({
    from: 'SimpleORder <noreply@orderp.xyz>',
    to: tenant.notification_email,
    subject: 'Yeni bayi kaydoldu',
    html: `
      <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 32px;">
        <h2 style="font-size: 22px; margin-bottom: 8px;">${tenant.name}</h2>
        <p style="color: #666; font-size: 14px; margin-bottom: 24px;">Yeni bir bayi kaydoldu.</p>
        <div style="background: #f5f2ec; border-radius: 10px; padding: 20px; font-size: 14px;">
          <div style="margin-bottom: 8px;"><strong>Ad Soyad:</strong> ${dealerName}</div>
          <div><strong>E-posta:</strong> ${dealerEmail}</div>
        </div>
        <p style="font-size: 12px; color: #aaa; margin-top: 24px;">nexerp.orderp.xyz/${slug}/dealers</p>
      </div>
    `,
  })

  return NextResponse.json({ ok: true })
}
