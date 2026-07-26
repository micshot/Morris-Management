"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [showSlots, setShowSlots] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && sessionStorage.getItem("mm_notice_ack") === "1") {
      setNoticeDismissed(true);
    }
  }, []);

  function ackNotice() {
    setNoticeDismissed(true);
    try { sessionStorage.setItem("mm_notice_ack", "1"); } catch {}
  }
  const convId = useRef<string>("");
  if (!convId.current && typeof window !== "undefined") {
    const KEY = "mm_conv_id";
    let v = sessionStorage.getItem(KEY);
    if (!v) { v = crypto.randomUUID ? crypto.randomUUID() : String(Date.now()); sessionStorage.setItem(KEY, v); }
    convId.current = v;
  }
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading, showSlots]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next); setInput(""); setLoading(true);
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next, conversationId: convId.current }) });
      const data = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply ?? data.error ?? "Something went wrong." }]);
    } catch { setMessages([...next, { role: "assistant", content: "Connection error." }]); }
    finally { setLoading(false); }
  }

  async function openSlots() {
    setShowSlots(true);
    try { const d = await (await fetch("/api/slots")).json(); setSlots(d.slots ?? []); } catch { setSlots([]); }
  }
  async function book(startsAt: string) {
    const res = await fetch("/api/bookings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conversationId: convId.current, startsAt }) });
    if (res.ok) {
      setShowSlots(false);
      setMessages((m) => [...m, { role: "assistant", content: `Your intro call is booked for ${new Date(startsAt).toLocaleString()}. An agent will be in touch to confirm.` }]);
    }
  }

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "26px 20px", display: "flex", flexDirection: "column", height: "100vh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "1px solid var(--line-strong)", paddingBottom: 14, marginBottom: 18 }}>
        <div>
          <div className="eyebrow">Morris Management</div>
          <h1 style={{ fontSize: 26, marginTop: 3 }}>Property Assistant</h1>
        </div>
        <button className="btn btn-gold" onClick={openSlots}>Book a call</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 12 }}>
        {messages.length === 0 && !showSlots && (
          <div className="panel" style={{ padding: 18 }}>
            <p className="muted" style={{ margin: 0 }}>Ask about available properties — areas, prices, rooms. Try: <span style={{ color: "var(--gold-soft)" }}>&ldquo;What do you have in Modi&rsquo;in?&rdquo;</span></p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%",
            background: m.role === "user" ? "var(--gold)" : "var(--surface)",
            color: m.role === "user" ? "#101a16" : "var(--text)",
            border: m.role === "user" ? "none" : "1px solid var(--line-strong)",
            borderRadius: 12, padding: "10px 14px", fontSize: 14, whiteSpace: "pre-wrap", lineHeight: 1.5,
            fontWeight: m.role === "user" ? 500 : 400,
          }}>{m.content}</div>
        ))}
        {showSlots && (
          <div className="panel" style={{ padding: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--forest)", marginBottom: 10 }}>Pick a 15-minute intro call:</div>
            {slots.length === 0 ? <p className="muted" style={{ fontSize: 13 }}>Loading times…</p> : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {slots.map((s) => (
                  <button key={s} className="btn btn-ghost btn-sm" onClick={() => book(s)}>
                    {new Date(s).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric" })}
                  </button>
                ))}
              </div>
            )}
            <button onClick={() => setShowSlots(false)} style={{ marginTop: 10, background: "transparent", color: "var(--muted)", border: "none", fontSize: 12, cursor: "pointer", padding: 0 }}>Cancel</button>
          </div>
        )}
        {loading && <div className="muted" style={{ alignSelf: "flex-start", fontSize: 14, padding: "8px 12px" }}>…</div>}
        <div ref={endRef} />
      </div>

      {messages.length > 0 && !noticeDismissed && (
        <div className="privacy-note">
          <span>
            By continuing this chat you agree that we may collect and store the details you share —
            including your name, phone number, email and what you tell us about your property search —
            along with technical data such as your IP address, so an agent can follow up with you.
          </span>
          <button onClick={ackNotice} aria-label="Dismiss notice">Got it</button>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, paddingTop: 12, borderTop: "1px solid var(--line-strong)" }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" />
        <button className="btn btn-gold" onClick={send} disabled={loading}>Send</button>
      </div>
    </main>
  );
}
