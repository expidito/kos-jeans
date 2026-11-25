import { requireAdmin } from "@/lib/admin/auth";
import {
  contentKeys,
  defaults,
  type ContentKey,
  type ContentValue,
} from "@/lib/content/policy";
import { SettingForm } from "@/components/admin/content/settings-form";
export default async function Settings() {
  const { client } = await requireAdmin();
  const { data, error } = await client
    .from("store_settings")
    .select("*")
    .in("key", [...contentKeys]);
  if (error) throw Error("Не вдалося завантажити налаштування.");
  return (
    <>
      <p className="mb-3 text-[10px] tracking-[0.18em] text-denim">
        КОНТЕНТ / KOS JEANS
      </p>
      <h1 className="text-4xl tracking-tight sm:text-5xl">
        Налаштування магазину
      </h1>
      <p className="mt-4 mb-8 max-w-2xl text-sm leading-7 text-muted">
        Контакти, соціальні сторінки та інформація для покупців. Погодьте
        реальні дані й юридичні тексти перед запуском. Індексація залишається
        вимкненою.
      </p>
      <div className="space-y-6">
        {contentKeys.map((key) => {
          const row = data?.find((r) => r.key === key);
          const value = { ...defaults[key] };
          if (
            row?.value &&
            typeof row.value === "object" &&
            !Array.isArray(row.value)
          )
            for (const f of Object.keys(value)) {
              const v = row.value[f];
              if (typeof v === typeof value[f])
                value[f] = v as string | boolean;
            }
          return (
            <SettingForm
              key={key}
              settingKey={key as ContentKey}
              initial={value as ContentValue}
              initialVersion={row?.updated_at ?? null}
            />
          );
        })}
      </div>
    </>
  );
}
