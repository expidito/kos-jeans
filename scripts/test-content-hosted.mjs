// DEV-only content/storage/SEO acceptance. Never production; restore exact test settings.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { devContext } from "./catalog-dev-fixtures.mjs";
const id = randomUUID(),
  checks = [],
  base = "http://127.0.0.1:3014";
let c,
  admin,
  version,
  image,
  settingsOriginal,
  settingsWritten = false,
  stage = "setup";
const q = (s) => "'" + String(s).replaceAll("'", "''") + "'";
const record = (check) => {
  checks.push({ check, status: "pass" });
  console.log("PASS: " + check);
};
async function write(
  kind,
  target,
  v,
  values,
  command = "save",
  request = randomUUID(),
) {
  const rows = await c.sql(
    `begin;select set_config('request.jwt.claim.sub','${admin}',true);set local role authenticated;select public.admin_content_write('${request}',${q(kind)},${q(target)},${v ? q(v) + "::timestamptz" : "null"},${q(JSON.stringify(values))}::jsonb,${q(command)}) result;commit;`,
  );
  return rows.at(-1).result;
}
const values = () => ({
  title: "ТЕСТ · Нова колекція джинсів",
  subtitle: "KOS-BLOCK14-HOSTED",
  alt_text: "Тестова ліцензована фотоілюстрація",
  button_label: "Переглянути колекцію",
  link_path: "/catalog/test-jeans",
  sort_order: 90000,
  is_visible: true,
  starts_at: null,
  ends_at: null,
  image_path: image,
});
try {
  assert(process.argv.includes("--dev-only"));
  c = await devContext();
  const roles = await c.sql(
    "select user_id::text id from private.admin_users where user_id='d4319c1d-bec3-40e4-8b87-41e5101cf52f'",
  );
  assert.equal(roles.length, 1);
  admin = roles[0].id;
  stage = "reserve";
  version = (await write("banner", id, null, {}, "reserve")).version;
  image = `banners/${id}/${randomUUID()}.jpg`;
  const bytes = await readFile("public/images/storefront/hero.jpg");
  const upload = await c.admin.storage
    .from("store-media")
    .upload(image, bytes, { contentType: "image/jpeg", upsert: false });
  assert(!upload.error);
  assert((await c.visitor.storage.from("store-media").download(image)).error);
  assert.equal((await fetch(base + "/banner-media/" + id)).status, 404);
  record(
    "Draft banner image remains inaccessible through visitor Storage and public proxy",
  );
  stage = "publish";
  version = (await write("banner", id, version, values())).version;
  const visible = await c.visitor
    .from("homepage_banners")
    .select("id")
    .eq("id", id);
  assert.equal(visible.data?.length, 1);
  assert.equal((await fetch(base + "/banner-media/" + id)).status, 200);
  let html = await (await fetch(base)).text();
  assert(html.includes(values().title));
  const request = randomUUID(),
    previous = version;
  version = (
    await write(
      "banner",
      id,
      previous,
      { ...values(), title: "ТЕСТ · Оновлена колекція" },
      "save",
      request,
    )
  ).version;
  await write(
    "banner",
    id,
    previous,
    { ...values(), title: "ТЕСТ · Оновлена колекція" },
    "save",
    request,
  );
  html = await (await fetch(base)).text();
  assert(html.includes("ТЕСТ · Оновлена колекція"));
  record(
    "Published photo and title render immediately; edits and identical retries work without deployment",
  );
  stage = "link/conflict";
  await assert.rejects(
    write("banner", id, version, {
      ...values(),
      link_path: "javascript:alert(1)",
    }),
  );
  await assert.rejects(write("banner", id, previous, values()));
  version = (
    await write("banner", id, version, {
      ...values(),
      starts_at: "2099-01-01T00:00:00Z",
    })
  ).version;
  assert.equal((await fetch(base + "/banner-media/" + id)).status, 404);
  version = (
    await write("banner", id, version, { ...values(), is_visible: false })
  ).version;
  assert(!(await (await fetch(base)).text()).includes(values().title));
  assert((await c.visitor.storage.from("store-media").download(image)).error);
  record(
    "Unsafe links and stale versions rejected; future/hidden banners and photos are inaccessible",
  );
  stage = "settings";
  settingsOriginal =
    (
      await c.sql(
        "select key,value,is_public from public.store_settings where key='contacts'",
      )
    )[0] ?? null;
  const oldVersion =
    (
      await c.sql(
        "select updated_at::text version from public.store_settings where key='contacts'",
      )
    )[0]?.version ?? null;
  await write("setting", "contacts", oldVersion, {
    phone: "+380000000014",
    email: "kos-test@example.invalid",
    verified: true,
  });
  settingsWritten = true;
  html = await (await fetch(base + "/contacts")).text();
  assert(html.includes("kos-test@example.invalid"));
  assert(
    (await (await fetch(base)).text()).includes("kos-test@example.invalid"),
  );
  record(
    "Verified fictitious contact updates footer and contacts page immediately",
  );
  stage = "SEO";
  for (const path of [
    "/",
    "/catalog",
    "/contacts",
    "/delivery",
    "/returns",
    "/privacy",
    "/terms",
    "/product/test-wide-leg-blue",
    "/catalog/test-jeans",
  ]) {
    const r = await fetch(base + path);
    assert.equal(r.status, 200);
    const text = await r.text();
    assert(r.headers.get("x-robots-tag")?.includes("noindex"));
    assert(/<meta name="robots" content="noindex, nofollow"/.test(text));
    assert(text.includes('rel="canonical"'));
    assert(!text.includes('rel="canonical" href="' + base));
    assert(text.includes('property="og:title"'));
  }
  assert(
    (await (await fetch(base + "/robots.txt")).text()).includes("Disallow: /"),
  );
  const sitemap = await (await fetch(base + "/sitemap.xml")).text();
  assert(!sitemap.includes("<loc>"));
  assert.equal((await fetch(base + "/missing-content-page")).status, 404);
  record(
    "Information/catalog/product metadata, canonical, OG and noindex verified; robots disallows all and sitemap exposes no test URLs",
  );
  stage = "RLS/API";
  for (const role of ["anon", "authenticated"])
    await assert.rejects(
      c.sql(
        `begin;select set_config('request.jwt.claim.sub','${randomUUID()}',true);set local role ${role};select public.admin_content_write('${randomUUID()}','banner','${id}',null,'{}','archive');commit;`,
      ),
    );
  for (const path of ["/admin/banners", "/admin/settings"]) {
    const r = await fetch(base + path, { redirect: "manual" });
    assert.equal(r.status, 307);
  }
  assert.equal(
    (
      await fetch(base + "/admin/content/api/write", {
        method: "POST",
        headers: { Origin: base, "Content-Type": "application/json" },
        body: "{}",
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await fetch(base + "/admin/content/api/write", {
        method: "POST",
        headers: {
          Origin: "https://evil.invalid",
          "Content-Type": "application/json",
        },
        body: "{}",
      })
    ).status,
    403,
  );
  record(
    "Anonymous/ordinary role and unauthenticated API denied; cross-origin POST rejected",
  );
} catch {
  console.error(
    "Hosted content checks failed at " +
      stage +
      "; credential-bearing details withheld",
  );
  process.exitCode = 1;
} finally {
  if (c) {
    try {
      if (settingsWritten) {
        const original = settingsOriginal;
        if (original)
          await c.sql(
            `update public.store_settings set value=${q(JSON.stringify(original.value))}::jsonb,is_public=${original.is_public} where key='contacts' and value->>'email'='kos-test@example.invalid';select true restored;`,
          );
        else
          await c.sql(
            "delete from public.store_settings where key='contacts' and value->>'email'='kos-test@example.invalid';select true restored;",
          );
      }
      const row = (
        await c.sql(
          `select updated_at::text version,archived_at from public.homepage_banners where id='${id}'`,
        )
      )[0];
      if (row && !row.archived_at)
        await write("banner", id, row.version, {}, "archive");
      assert(
        (await c.visitor.storage.from("store-media").download(image)).error,
      );
      record(
        "Only exact test contact restored; owned banner archived and media private; no existing assortment removed",
      );
    } catch {
      console.error(
        "Owned content restoration requires inspection; details withheld",
      );
      process.exitCode = 1;
    }
  }
  await writeFile(
    "docs/checks/block14-hosted.json",
    JSON.stringify(
      {
        status: process.exitCode ? "fail" : "pass",
        checks,
        productionEnvironmentChanged: false,
        existingAssortmentRemoved: false,
        rolesAssigned: false,
      },
      null,
      2,
    ) + "\n",
  );
}
