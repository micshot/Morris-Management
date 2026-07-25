"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const FOREST = "#1B3A2F";
const GOLD = "#A88532";
const IVORY = "#F7F5EF";
const SAGE = "#6B7A70";
const LINE = "#D6DDD4";

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.reply ?? data.error ?? "Something went wrong.",
        },
      ]);
    } catch {
      setMessages([...next, { role: "assistant", content: "Connection error." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1.25rem", display: "flex", flexDirection: "column", height: "100vh", boxSizing: "border-box" }}>
      <div style={{ borderBottom: `2px solid ${GOLD}`, paddingBottom: 12, marginBottom: 16 }}>
        <h1 style={{ color: FOREST, fontSize: 22, fontWeight: 800, margin: 0 }}>Property Assistant</h1>
        <p style={{ color: SAGE, fontSize: 13, margin: "4px 0 0" }}>Ask about available properties.</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingBottom: 12 }}>
        {messages.length === 0 && (
          <p style={{ color: SAGE, fontSize: 14 }}>Try: &ldquo;What do you have in Modi&rsquo;in?&rdquo;</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "80%",
              background: m.role === "user" ? FOREST : "#fff",
              color: m.role === "user" ? IVORY : "#1A1D1B",
              border: m.role === "user" ? "none" : `1px solid ${LINE}`,
              borderRadius: 10,
              padding: "9px 13px",
              fontSize: 14,
              whiteSpace: "pre-wrap",
              lineHeight: 1.45,
            }}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: "flex-start", color: SAGE, fontSize: 14, padding: "9px 13px" }}>…</div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 8, paddingTop: 8, borderTop: `1px solid ${LINE}` }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          style={{ flex: 1, padding: "10px 12px", border: `1px solid ${LINE}`, borderRadius: 8, fontSize: 14, color: "#1A1D1B" }}
        />
        <button
          onClick={send}
          disabled={loading}
          style={{ background: FOREST, color: IVORY, border: "none", borderRadius: 8, padding: "0 18px", fontSize: 14, fontWeight: 600, cursor: loading ? "default" : "pointer", opacity: loading ? 0.6 : 1 }}
        >
          Send
        </button>
      </div>
    </main>
  );
}
