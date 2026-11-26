import "server-only";
import { cache } from "react";
import { publicCatalogClient } from "@/lib/catalog/data";
import {
  defaults,
  contentKeys,
  type ContentKey,
  type ContentValue,
} from "./policy";
export const getPublicContent = cache(async () => {
  const values = structuredClone(defaults);
  const client = publicCatalogClient();
  if (!client) return values;
  const { data, error } = await client
    .from("store_settings")
    .select("key,value")
    .in("key", [...contentKeys]);
  if (error) throw Error("Не вдалося завантажити інформацію магазину.");
  for (const row of data ?? []) {
    if (
      contentKeys.includes(row.key as ContentKey) &&
      row.value &&
      typeof row.value === "object" &&
      !Array.isArray(row.value)
    ) {
      const key = row.key as ContentKey,
        v = row.value as ContentValue;
      for (const field of Object.keys(defaults[key]))
        if (typeof v[field] === typeof defaults[key][field])
          values[key][field] = v[field];
    }
  }
  return values;
});
export async function publicBanners() {
  const client = publicCatalogClient();
  if (!client) return [];
  const { data, error } = await client
    .from("homepage_banners")
    .select(
      "id,title,subtitle,alt_text,button_label,link_path,image_path,updated_at",
    )
    .order("sort_order")
    .order("id")
    .limit(20);
  if (error) throw Error("Не вдалося завантажити банери.");
  return (data ?? []).filter((b) => b.image_path);
}
