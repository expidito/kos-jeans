"use client";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { useContentRequest } from "./request";
type Banner = Database["public"]["Tables"]["homepage_banners"]["Row"];
const field =
  "mt-2 min-h-12 w-full min-w-0 border border-control bg-paper px-3 text-base";
function localDate(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}
export function BannerEditor({
  initial,
  targets,
}: {
  initial: Banner;
  targets: { path: string; name: string }[];
}) {
  const router = useRouter();
  const [version, setVersion] = useState(initial.updated_at),
    [values, setValues] = useState({
      title: initial.title,
      subtitle: initial.subtitle,
      alt_text: initial.alt_text,
      button_label: initial.button_label || "",
      link_path: initial.link_path || "/catalog",
      image_path: initial.image_path,
      sort_order: initial.sort_order,
      is_visible: initial.is_visible,
      starts_at: localDate(initial.starts_at),
      ends_at: localDate(initial.ends_at),
    }),
    [preview, setPreview] = useState<string | null>(null),
    [uploading, setUploading] = useState(false),
    [uploadError, setUploadError] = useState(""),
    [archive, setArchive] = useState(false);
  const { save, busy, error, success } = useContentRequest();
  const archived = !!initial.archived_at;
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  async function upload(file: File) {
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.set("banner_id", initial.id);
      form.set("image", file);
      const r = await fetch("/admin/content/api/upload", {
        method: "POST",
        body: form,
      });
      const data = await r.json();
      if (!r.ok) throw Error(data.error);
      setValues((v) => ({ ...v, image_path: data.path }));
      setPreview(URL.createObjectURL(file));
    } catch (e) {
      setUploadError(
        e instanceof Error ? e.message : "Не вдалося завантажити фото.",
      );
    } finally {
      setUploading(false);
    }
  }
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const result = await save({
          kind: "banner",
          target: initial.id,
          version,
          command: "save",
          values: {
            ...values,
            starts_at: values.starts_at
              ? new Date(values.starts_at).toISOString()
              : null,
            ends_at: values.ends_at
              ? new Date(values.ends_at).toISOString()
              : null,
          },
        });
        if (result) {
          setVersion(result.version);
          router.refresh();
        }
      }}
      className="max-w-5xl"
    >
      <h1 className="text-4xl tracking-tight">
        {archived ? "Архівний банер" : "Редагування банера"}
      </h1>
      <p className="my-5 text-sm leading-7 text-muted">
        Публікація змінює головну без нового деплоя. Дати вводяться в часовому
        поясі вашого пристрою. Для фото обирайте широкий кадр із важливим
        об’єктом ближче до центру.
      </p>
      <fieldset
        disabled={archived || busy || uploading}
        className="grid min-w-0 gap-6 lg:grid-cols-2"
      >
        <div className="min-w-0 space-y-5 border border-line bg-paper p-5 sm:p-7">
          {(["title", "subtitle", "alt_text", "button_label"] as const).map(
            (k) => (
              <label key={k} className="block text-xs">
                {
                  {
                    title: "Заголовок",
                    subtitle: "Підзаголовок",
                    alt_text: "Опис зображення",
                    button_label: "Текст кнопки",
                  }[k]
                }
                <input
                  value={values[k]}
                  maxLength={
                    k === "subtitle" ? 500 : k === "button_label" ? 80 : 200
                  }
                  onChange={(e) =>
                    setValues({ ...values, [k]: e.target.value })
                  }
                  className={field}
                />
              </label>
            ),
          )}
          <label className="block text-xs">
            Сторінка кнопки
            <select
              value={values.link_path}
              onChange={(e) =>
                setValues({ ...values, link_path: e.target.value })
              }
              className={field}
            >
              {targets.map((t) => (
                <option key={t.path} value={t.path}>
                  {t.name}
                </option>
              ))}
              {!targets.some((t) => t.path === values.link_path) && (
                <option value={values.link_path}>
                  {values.link_path} (перевірте доступність)
                </option>
              )}
            </select>
          </label>
          <label className="block text-xs">
            Порядок показу
            <input
              type="number"
              min={0}
              max={1000000}
              value={values.sort_order}
              onChange={(e) =>
                setValues({ ...values, sort_order: Number(e.target.value) })
              }
              className={field}
            />
          </label>
          <label className="block text-xs">
            Початок показу
            <input
              type="datetime-local"
              value={values.starts_at}
              onChange={(e) =>
                setValues({ ...values, starts_at: e.target.value })
              }
              className={field}
            />
          </label>
          <label className="block text-xs">
            Завершення показу
            <input
              type="datetime-local"
              value={values.ends_at}
              onChange={(e) =>
                setValues({ ...values, ends_at: e.target.value })
              }
              className={field}
            />
          </label>
          <label className="flex items-start gap-3 text-sm leading-6">
            <input
              type="checkbox"
              checked={values.is_visible}
              onChange={(e) =>
                setValues({ ...values, is_visible: e.target.checked })
              }
              className="mt-1 size-4 shrink-0"
            />
            Показувати на головній у заданий період
          </label>
        </div>
        <div className="min-w-0 space-y-5 border border-line bg-paper p-5 sm:p-7">
          {values.image_path && (preview || initial.image_path) && (
            <div className="relative aspect-[4/3] overflow-hidden bg-canvas">
              <Image
                unoptimized
                src={
                  preview ||
                  `/admin/banner-media/${initial.id}?v=${encodeURIComponent(version)}`
                }
                alt={values.alt_text || "Фото банера"}
                fill
                sizes="(max-width:1024px) 100vw,480px"
                className="object-cover"
              />
            </div>
          )}
          <p className="text-xs leading-6 text-muted">
            {values.image_path
              ? "Фото підготовлено. Збережіть банер, щоб застосувати зміни."
              : "Фото ще не додано."}
          </p>
          <label className="block text-sm">
            Фото банера (JPEG, PNG, WebP до 3 МБ)
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
              }}
              className="mt-3 block min-h-12 max-w-full text-xs"
            />
          </label>
          {values.image_path && (
            <button
              type="button"
              className="min-h-11 text-xs underline"
              onClick={() =>
                setValues({ ...values, image_path: null, is_visible: false })
              }
            >
              Прибрати фото зі сторінки
            </button>
          )}
          <p className="text-xs leading-6 text-muted">
            Приховані та архівні фото залишаються приватними. При заміні старий
            файл зберігається для аудиту, жорстке видалення не виконується.
          </p>
        </div>
      </fieldset>
      {uploadError && (
        <p role="alert" className="mt-4 text-sm text-red-800">
          {uploadError}
        </p>
      )}
      {uploading && (
        <p role="status" className="mt-4 text-sm">
          Завантаження…
        </p>
      )}
      {!archived && (
        <div className="mt-6 flex flex-wrap gap-4">
          <button
            disabled={busy || uploading}
            className="min-h-12 bg-ink px-6 text-sm text-paper disabled:opacity-50"
          >
            {busy ? "Збереження…" : "Зберегти банер"}
          </button>
          <button
            type="button"
            disabled={busy || uploading}
            onClick={() => setArchive(!archive)}
            className="min-h-12 border border-control px-5 text-sm"
          >
            Архівувати
          </button>
        </div>
      )}
      {archive && !archived && (
        <div className="mt-5 border border-line bg-paper p-5">
          <p className="text-sm leading-7">
            Архівувати банер? Він зникне з головної. Фото й історія збережуться.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              const r = await save({
                kind: "banner",
                target: initial.id,
                version,
                command: "archive",
                values: {},
              });
              if (r) router.push("/admin/banners");
            }}
            className="mt-4 min-h-12 bg-ink px-5 text-sm text-paper"
          >
            Підтвердити архівування
          </button>
        </div>
      )}
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
