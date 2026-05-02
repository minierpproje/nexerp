"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "bot";
  text: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Merhaba! SimpleORder hakkında sorularınızı yanıtlayabilirim. Size nasıl yardımcı olabilirim?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "bot", text: "Bağlantı hatası oluştu, lütfen tekrar deneyin." }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Chat penceresi */}
      {open && (
        <div style={{
          position: "fixed", bottom: "80px", right: "20px", width: "320px",
          height: "420px", background: "#fff", borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex",
          flexDirection: "column", zIndex: 1000, overflow: "hidden",
        }}>
          {/* Header */}
          <div style={{
            background: "#2d7a57", color: "#fff", padding: "12px 16px",
            fontWeight: 600, fontSize: "14px", display: "flex",
            justifyContent: "space-between", alignItems: "center",
          }}>
            <span>SimpleORder Destek</span>
            <button onClick={() => setOpen(false)} style={{
              background: "none", border: "none", color: "#fff",
              cursor: "pointer", fontSize: "18px", lineHeight: 1,
            }}>×</button>
          </div>

          {/* Mesajlar */}
          <div style={{ flex: 1, overflowY: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {messages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                background: m.role === "user" ? "#2d7a57" : "#f1f1f1",
                color: m.role === "user" ? "#fff" : "#222",
                borderRadius: "10px", padding: "8px 12px",
                maxWidth: "85%", fontSize: "13px", lineHeight: "1.4",
              }}>{m.text}</div>
            ))}
            {loading && (
              <div style={{
                alignSelf: "flex-start", background: "#f1f1f1",
                borderRadius: "10px", padding: "8px 12px", fontSize: "13px", color: "#888",
              }}>Yazıyor...</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "10px", borderTop: "1px solid #eee", display: "flex", gap: "6px" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Mesajınızı yazın..."
              style={{
                flex: 1, border: "1px solid #ddd", borderRadius: "8px",
                padding: "8px 10px", fontSize: "13px", outline: "none",
              }}
            />
            <button onClick={send} disabled={loading} style={{
              background: "#2d7a57", color: "#fff", border: "none",
              borderRadius: "8px", padding: "8px 14px", cursor: "pointer",
              fontSize: "13px", fontWeight: 600,
            }}>Gönder</button>
          </div>
        </div>
      )}

      {/* Açma butonu */}
      <button onClick={() => setOpen((v) => !v)} style={{
        position: "fixed", bottom: "20px", right: "20px",
        width: "54px", height: "54px", borderRadius: "50%",
        background: "#2d7a57", color: "#fff", border: "none",
        cursor: "pointer", fontSize: "24px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {open ? "×" : "💬"}
      </button>
    </>
  );
}
