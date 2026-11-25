"use client";
import { useRef, useState } from "react";
export function useContentRequest() {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState("");
  const flight = useRef(false),
    pending = useRef<{ body: string; id: string } | null>(null);
  async function save(body: Record<string, unknown>) {
    if (flight.current) return null;
    flight.current = true;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const signature = JSON.stringify(body);
      if (pending.current?.body !== signature)
        pending.current = { body: signature, id: crypto.randomUUID() };
      const r = await fetch("/admin/content/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, request_id: pending.current.id }),
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error || "Не вдалося зберегти.");
      pending.current = null;
      setSuccess("Збережено. Публічні сторінки оновляться без деплоя.");
      return data as { id: string; version: string };
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Помилка з’єднання. Повторіть запит.",
      );
      return null;
    } finally {
      flight.current = false;
      setBusy(false);
    }
  }
  return { save, busy, error, success };
}
