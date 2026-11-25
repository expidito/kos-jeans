"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  orderStatuses,
  transitions,
  type OrderStatus,
} from "@/lib/admin/orders/policy";
export function OrderStatusControl({
  id,
  status,
  version,
}: {
  id: string;
  status: OrderStatus;
  version: string;
}) {
  const router = useRouter();
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false),
    [target, setTarget] = useState<OrderStatus | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  async function save() {
    if (!target || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/admin/orders/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: target, version }),
      });
      const body = await r.json();
      if (!r.ok) throw Error(body.error || "Не вдалося змінити статус.");
      setMessage(
        body.missingVariants
          ? "Статус збережено. Частину варіантів видалено: їхні залишки не відновлено. Перевірте склад вручну."
          : body.repeated
            ? "Цей статус уже збережено. Повторного повернення залишків немає."
            : target === "cancelled"
              ? "Замовлення скасовано. Залишки наявних варіантів повернено один раз."
              : "Статус замовлення оновлено.",
      );
      setTarget(null);
      router.refresh();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Помилка з’єднання. Повторіть запит або оновіть сторінку.",
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      aria-label="Керування статусом"
      className="border border-line bg-paper p-5 sm:p-7"
    >
      <h2 className="text-xl font-medium">Статус замовлення</h2>
      <p className="mt-3 text-sm leading-6 text-muted">
        {status === "cancelled"
          ? "Замовлення скасовано. Відновлення активного статусу недоступне."
          : status === "completed"
            ? "Замовлення завершено. Подальші переходи недоступні."
            : "Зміна статусу перевіряється сервером. Скасування повертає залишки лише один раз."}
      </p>
      {transitions[status].length > 0 && (
        <>
          <label className="mt-5 block text-xs">
            Новий статус
            <select
              disabled={busy}
              value={target ?? ""}
              onChange={(e) => {
                setTarget((e.target.value as OrderStatus) || null);
                setError("");
              }}
              className="mt-2 min-h-12 w-full border border-control px-3 text-base"
            >
              <option value="">Оберіть статус</option>
              {transitions[status].map((s) => (
                <option key={s} value={s}>
                  {orderStatuses[s]}
                </option>
              ))}
            </select>
          </label>
          {target && (
            <div className="mt-5 border border-line bg-canvas p-4">
              <p className="text-sm leading-6">
                {target === "cancelled"
                  ? "Скасувати замовлення та повернути залишки? Цю дію не можна скасувати простим відновленням статусу."
                  : `Змінити статус на «${orderStatuses[target]}»?`}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  disabled={busy}
                  onClick={save}
                  className="min-h-12 bg-ink px-5 text-sm text-paper disabled:opacity-50"
                >
                  {busy
                    ? "Збереження…"
                    : target === "cancelled"
                      ? "Підтвердити скасування"
                      : "Підтвердити зміну"}
                </button>
                <button
                  disabled={busy}
                  onClick={() => setTarget(null)}
                  className="min-h-12 border border-control px-4 text-sm"
                >
                  Назад
                </button>
              </div>
            </div>
          )}
        </>
      )}
      {error && (
        <div role="alert" className="mt-4 text-sm leading-6 text-red-800">
          <p>{error}</p>
          <button
            className="mt-2 min-h-11 underline"
            onClick={() => {
              router.refresh();
              setTarget(null);
              setError("");
            }}
          >
            Оновити дані
          </button>
        </div>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm leading-6 text-denim">
          {message}
        </p>
      )}
    </section>
  );
}
