import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `Sen SimpleORder platformunun Türkçe canlı destek asistanısın. Kısa, net ve yardımsever cevaplar ver.

SimpleORder hakkında bilgiler:
- SimpleORder küçük ve orta ölçekli işletmeler için modüler bir ERP/sipariş yönetim platformudur.
- Web sitesi: simpleor.com
- Fiyatlandırma: İlk modül 790 TL/ay, her ek modül +100 TL/ay

Mevcut modüller:
1. Bayi Sipariş Yönetimi: Bayilerden gelen siparişleri yönetme
2. Stok Yönetimi: Ürün ekleme/çıkarma, stok takibi
3. Aktivite Yönetimi: Firma aktiviteleri, fatura ve ödeme takip
4. Müşteri Bilgi Sistemi (CRM): Müşteri listesi, Excel import/export

Kayıt: simpleor.com adresine git, modülleri seç, formu doldur.
Destek: destek@simpleor.com`;

export async function POST(req: NextRequest) {
  try {
    const { message } = await req.json();
    const key = process.env.GEMINI_API_KEY;
    
    if (!key) {
      console.error("GEMINI_API_KEY not found");
      return NextResponse.json({ reply: "API key eksik." });
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: message }] }],
        }),
      }
    );

    const data = await res.json();
    console.log("Gemini response:", JSON.stringify(data).slice(0, 300));
    
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Yanıt alınamadı.";
    return NextResponse.json({ reply });
  } catch (e) {
    console.error("Chat error:", e);
    return NextResponse.json({ reply: "Üzgünüm, bir sorun oluştu." });
  }
}
