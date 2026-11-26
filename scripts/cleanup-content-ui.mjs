// Exact-baseline DEV-only teardown for this block's UI acceptance. Never print values.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { devContext } from "./catalog-dev-fixtures.mjs";
import { defaults } from "../src/lib/content/policy.ts";
const quote = (s) => "'" + String(s).replaceAll("'", "''") + "'";
try {
  assert(process.argv.includes("--dev-only"));
  const baseline = JSON.parse(
    await readFile("/tmp/kos-block14-ui-baseline.json", "utf8"),
  );
  assert(/^[a-f0-9-]{36}$/.test(baseline.banner.id));
  const c = await devContext();
  const current = await c.sql(
    "select key,value,is_public from public.store_settings where key in ('contacts','social_links')",
  );
  // Repeat is a no-op after exact restoration.
  const original = baseline.settings;
  const sorted = (rows) => [...rows].sort((a, b) => a.key.localeCompare(b.key));
  let repeat = false;
  try {
    assert.deepEqual(sorted(current), sorted(original));
    repeat = true;
  } catch {}
  if (!repeat) {
    let sql =
      "begin;select pg_advisory_xact_lock(52005001);select pg_advisory_xact_lock(52005002);";
    for (const key of ["contacts", "social_links"]) {
      const row = original.find((r) => r.key === key),
        expected = { ...defaults[key] };
      if (row?.value && typeof row.value === "object")
        for (const field of Object.keys(expected))
          if (typeof row.value[field] === typeof expected[field])
            expected[field] = row.value[field];
      if (key === "contacts") {
        expected.phone = "+380000000014";
        expected.email = "kos-ui-test@example.invalid";
        expected.verified = true;
      } else {
        expected.instagram = "https://www.instagram.com/";
        expected.verified = true;
      }
      assert.deepEqual(current.find((r) => r.key === key)?.value, expected);
      sql += `do $$begin if (select value from public.store_settings where key=${quote(key)} for update) is distinct from ${quote(JSON.stringify(expected))}::jsonb then raise exception 'fixture changed';end if;end$$;`;
      sql += row
        ? `update public.store_settings set value=${quote(JSON.stringify(row.value))}::jsonb,is_public=${row.is_public} where key=${quote(key)};`
        : `delete from public.store_settings where key=${quote(key)};`;
    }
    await c.sql(sql + "commit;select true restored;");
  }
  const restored = await c.sql(
    "select key,value,is_public from public.store_settings where key in ('contacts','social_links')",
  );
  assert.deepEqual(sorted(restored), sorted(original));
  const b = (
    await c.sql(
      `select is_visible,archived_at,image_path,subtitle from public.homepage_banners where id='${baseline.banner.id}'`,
    )
  )[0];
  assert(b.archived_at && !b.is_visible);
  assert.equal(b.subtitle, "ТЕСТ · Блок 14 — перевірка Preview");
  assert.equal(b.image_path, baseline.banner.image_path);
  assert(
    (await c.visitor.storage.from("store-media").download(b.image_path)).error,
  );
  await writeFile(
    "docs/checks/block14-ui-restored.json",
    JSON.stringify(
      {
        status: "pass",
        originalContactAndSocialSettingsRestored: true,
        testBannerArchived: true,
        photoRetainedPrivately: true,
        publicPhotoAccessDenied: true,
        existingAssortmentRemoved: false,
        repeatSafe: true,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: original contact/social settings restored; exact UI banner archived and photo private",
  );
} catch {
  console.error("Content UI restoration failed; sensitive details withheld");
  process.exitCode = 1;
}
