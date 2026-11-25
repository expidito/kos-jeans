"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function ArchiveProduct({
  id,
  version,
  compact = false,
}: {
  id: string;
  version: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false);
  return (
    <details
      className={compact ? "mt-3" : "mt-10 border border-line bg-paper p-6"}
    >
      <summary className="min-h-11 content-center text-xs font-semibold">
        Архівувати товар
      </summary>
      <p className="mt-3 text-xs leading-6 text-muted">
        Товар і фото зникнуть з магазину. Дані та варіанти збережуться для
        відновлення.
      </p>
      <form
        className="mt-3 space-y-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setError("");
          try {
            const r = await fetch("/admin/products/api/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id,
                version,
                request_id: crypto.randomUUID(),
                command: "archive",
              }),
            });
            const data = await r.json();
            if (!r.ok)
              throw Error(data.error || "Не вдалося архівувати товар.");
            router.refresh();
          } catch (e) {
            setError(
              e instanceof Error
                ? e.message
                : "Немає з’єднання. Спробуйте ще раз.",
            );
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="flex min-h-11 items-start gap-2 text-xs leading-6">
          <input type="checkbox" required className="mt-1 accent-ink" />
          Підтверджую архівування
        </label>
        {error && (
          <p role="alert" className="text-xs text-danger">
            {error}
          </p>
        )}
        <button
          disabled={pending}
          className="min-h-11 border border-control px-3 text-xs disabled:opacity-50"
        >
          {pending ? "Збереження…" : "Архівувати"}
        </button>
      </form>
    </details>
  );
}
