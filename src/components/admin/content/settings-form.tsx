"use client";
import { useState } from "react";
import {
  contentLabels,
  type ContentKey,
  type ContentValue,
} from "@/lib/content/policy";
import { useContentRequest } from "./request";
const field =
  "mt-2 min-h-12 w-full min-w-0 border border-control bg-paper px-3 text-base";
const fieldLabels: Record<string, string> = {
  name: "Назва магазину",
  phone: "Контактний телефон (+380…)",
  email: "Контактний email",
  instagram: "Instagram (HTTPS)",
  facebook: "Facebook (HTTPS)",
  tiktok: "TikTok (HTTPS)",
  other: "Інша сторінка (HTTPS)",
  text: "Текст українською",
};
const saveLabels: Record<ContentKey, string> = {
  brand: "назву магазину",
  contacts: "контакти",
  social_links: "соціальні мережі",
  about: "інформацію про магазин",
  delivery_template: "умови доставки",
  payment_template: "умови оплати",
  returns_template: "умови обміну й повернення",
  privacy_template: "політику конфіденційності",
  terms_template: "умови користування",
};
export function SettingForm({
  settingKey,
  initial,
  initialVersion,
}: {
  settingKey: ContentKey;
  initial: ContentValue;
  initialVersion: string | null;
}) {
  const [values, setValues] = useState(initial),
    [version, setVersion] = useState(initialVersion);
  const { save, busy, error, success } = useContentRequest();
  return (
    <form
      aria-label={contentLabels[settingKey]}
      className="min-w-0 border border-line bg-paper p-5 sm:p-8"
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await save({
          kind: "setting",
          target: settingKey,
          command: "save",
          version,
          values,
        });
        if (result) setVersion(result.version);
      }}
    >
      <h2 className="mb-6 text-2xl font-medium">{contentLabels[settingKey]}</h2>
      <fieldset disabled={busy} className="space-y-5">
        {Object.entries(values).map(([k, v]) =>
          typeof v === "boolean" ? (
            <label key={k} className="flex items-start gap-3 text-sm leading-6">
              <input
                type="checkbox"
                checked={v}
                onChange={(e) =>
                  setValues({ ...values, [k]: e.target.checked })
                }
                className="mt-1 size-4 shrink-0"
              />
              {k === "verified"
                ? "Підтверджую, що ці контакти / сторінки перевірено й можна опублікувати."
                : "Чернетка — текст ще не погоджено для запуску."}
            </label>
          ) : (
            <label key={k} className="block min-w-0 text-xs">
              {fieldLabels[k] || k}
              {k === "text" ? (
                <textarea
                  value={v}
                  maxLength={12000}
                  onChange={(e) =>
                    setValues({ ...values, [k]: e.target.value })
                  }
                  rows={7}
                  className={field + " py-3 leading-7"}
                />
              ) : (
                <input
                  type={
                    k === "email" ? "email" : k === "phone" ? "tel" : "text"
                  }
                  value={v}
                  maxLength={k === "name" ? 100 : 500}
                  onChange={(e) =>
                    setValues({ ...values, [k]: e.target.value })
                  }
                  className={field}
                />
              )}
            </label>
          ),
        )}
      </fieldset>
      <p className="mt-5 text-xs leading-6 text-muted">
        Лише звичайний текст, без HTML. Не додавайте паролі, ключі, приватні
        дані чи неперевірені реквізити. Публікація контактів потребує
        підтвердження вище.
      </p>
      <button
        disabled={busy}
        className="mt-6 min-h-12 bg-ink px-5 text-sm text-paper disabled:opacity-50"
      >
        {busy ? "Збереження…" : "Зберегти " + saveLabels[settingKey]}
      </button>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-800">
          {error}
        </p>
      )}
      {success && (
        <p role="status" className="mt-4 text-sm text-denim">
          {success}
        </p>
      )}
    </form>
  );
}
