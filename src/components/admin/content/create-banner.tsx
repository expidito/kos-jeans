"use client";
import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useContentRequest } from "./request";
export function CreateBanner() {
  const router = useRouter(),
    id = useRef<string | null>(null);
  const { save, busy, error } = useContentRequest();
  return (
    <>
      <button
        disabled={busy}
        onClick={async () => {
          id.current ??= crypto.randomUUID();
          const r = await save({
            kind: "banner",
            target: id.current,
            version: null,
            command: "reserve",
            values: {},
          });
          if (r) router.push("/admin/banners/" + r.id);
        }}
        className="min-h-12 bg-ink px-5 text-sm text-paper disabled:opacity-50"
      >
        {busy ? "Створення…" : "Створити чернетку"}
      </button>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-800">
          {error}
        </p>
      )}
    </>
  );
}
