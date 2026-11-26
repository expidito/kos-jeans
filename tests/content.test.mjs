import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTestDatabase, withRole } from "./helpers/database.mjs";
import {
  settingInput,
  bannerInput,
  safeInternalLink,
  socialUrl,
} from "../src/lib/content/policy.ts";
import {
  indexingEnabled,
  canonicalOrigin,
  jsonLd,
  productSchema,
} from "../src/lib/seo/policy.ts";
const A = "10000000-0000-4000-8000-000000000010",
  U = "10000000-0000-4000-8000-000000000011";
let db;
before(async () => {
  db = await createTestDatabase();
  await db.exec(
    `insert into auth.users values('${A}'),('${U}');insert into private.admin_users values('${A}',now());`,
  );
});
after(() => db.close());
async function admin(fn) {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [A]);
    await db.exec("set local role authenticated");
    const r = await fn(db);
    await db.exec("commit");
    return r;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
const write = (
  d,
  kind,
  target,
  version,
  values,
  command = "save",
  key = randomUUID(),
) =>
  d.query(
    "select public.admin_content_write($1,$2,$3,$4,$5::jsonb,$6) result",
    [key, kind, target, version, JSON.stringify(values), command],
  );
const banner = (image) => ({
  title: "Нова колекція джинсів",
  subtitle: "ТЕСТ банер",
  alt_text: "ТЕСТ фото",
  button_label: "Переглянути колекцію",
  link_path: "/catalog/test-jeans",
  sort_order: 1,
  is_visible: true,
  starts_at: null,
  ends_at: null,
  image_path: image,
});
async function reserve() {
  const id = randomUUID();
  const r = (await admin((d) => write(d, "banner", id, null, {}, "reserve")))
    .rows[0].result;
  const image = `banners/${id}/${randomUUID()}.jpg`;
  await db.query(
    'insert into storage.objects(bucket_id,name,metadata) values(\'store-media\',$1,\'{"mimetype":"image/jpeg","size":100}\')',
    [image],
  );
  return { id, image, version: r.version };
}
test("content validators reject dangerous links/contacts, bound text and strip unknown settings", () => {
  for (const v of [
    "javascript:alert(1)",
    "//evil.com",
    "/admin",
    "/catalog/a?x=1",
    "/product/../x",
  ])
    assert.equal(safeInternalLink(v), false);
  assert(safeInternalLink("/catalog/test-jeans"));
  assert.throws(() => socialUrl("javascript:alert(1)"));
  assert.throws(() => socialUrl("https://user:pass@example.com/"));
  assert.throws(() =>
    settingInput("contacts", { phone: "123", email: "", verified: true }),
  );
  assert.deepEqual(
    settingInput("brand", { name: "KOS JEANS", secret: "never" }),
    { name: "KOS JEANS" },
  );
  assert.throws(() => bannerInput({ ...banner(null), is_visible: true }));
  assert.throws(() =>
    bannerInput({
      ...banner("x"),
      starts_at: "2030-01-02",
      ends_at: "2030-01-01",
    }),
  );
});
test("settings require role, allow only typed public fields, hide unverified contacts and protect versions/retries", async () => {
  await assert.rejects(
    withRole(db, "authenticated", U, (d) =>
      write(d, "setting", "brand", null, { name: "Spoof" }),
    ),
    (e) => e.code === "42501",
  );
  const request = randomUUID();
  const r = (
    await admin((d) =>
      write(
        d,
        "setting",
        "brand",
        null,
        { name: "KOS TEST", secret: "stripped" },
        "save",
        request,
      ),
    )
  ).rows[0].result;
  await admin((d) =>
    write(
      d,
      "setting",
      "brand",
      null,
      { name: "KOS TEST", secret: "stripped" },
      "save",
      request,
    ),
  );
  assert.deepEqual(
    (
      await db.query(
        "select value from public.store_settings where key='brand'",
      )
    ).rows[0].value,
    { name: "KOS TEST" },
  );
  await assert.rejects(
    admin((d) => write(d, "setting", "brand", null, { name: "stale" })),
    (e) => e.code === "40001",
  );
  await assert.rejects(
    admin((d) =>
      write(
        d,
        "setting",
        "brand",
        r.version,
        { name: "different" },
        "save",
        request,
      ),
    ),
    (e) => e.code === "P0012",
  );
  await admin((d) =>
    write(d, "setting", "contacts", null, {
      phone: "+380000000014",
      email: "test@example.invalid",
      verified: false,
    }),
  );
  await withRole(db, "anon", null, async (d) =>
    assert.equal(
      (
        await d.query(
          "select * from public.store_settings where key='contacts'",
        )
      ).rows.length,
      0,
    ),
  );
  await assert.rejects(
    admin((d) =>
      d.exec("update public.store_settings set value='{}' where key='brand'"),
    ),
    (e) => e.code === "42501",
  );
});
test("banner publication requires a linked Storage photo and safe public target; hidden/scheduled/archived photos are private", async () => {
  const b = await reserve();
  await withRole(db, "anon", null, async (d) => {
    assert.equal(
      (
        await d.query("select * from public.homepage_banners where id=$1", [
          b.id,
        ])
      ).rows.length,
      0,
    );
    assert.equal(
      (await d.query("select * from storage.objects where name=$1", [b.image]))
        .rows.length,
      0,
    );
  });
  for (const values of [
    { ...banner(b.image), link_path: "//evil.example" },
    { ...banner(b.image), link_path: "/catalog/test-hidden" },
    { ...banner(b.image), image_path: `banners/${b.id}/${randomUUID()}.jpg` },
  ])
    await assert.rejects(
      admin((d) => write(d, "banner", b.id, b.version, values)),
    );
  let version = (
    await admin((d) => write(d, "banner", b.id, b.version, banner(b.image)))
  ).rows[0].result.version;
  await withRole(db, "anon", null, async (d) =>
    assert.equal(
      (await d.query("select * from storage.objects where name=$1", [b.image]))
        .rows.length,
      1,
    ),
  );
  version = (
    await admin((d) =>
      write(d, "banner", b.id, version, {
        ...banner(b.image),
        starts_at: "2099-01-01T00:00:00Z",
      }),
    )
  ).rows[0].result.version;
  await withRole(db, "anon", null, async (d) =>
    assert.equal(
      (await d.query("select * from storage.objects where name=$1", [b.image]))
        .rows.length,
      0,
    ),
  );
  version = (
    await admin((d) => write(d, "banner", b.id, version, banner(b.image)))
  ).rows[0].result.version;
  await admin((d) => write(d, "banner", b.id, version, {}, "archive"));
  await withRole(db, "anon", null, async (d) => {
    assert.equal(
      (
        await d.query("select * from public.homepage_banners where id=$1", [
          b.id,
        ])
      ).rows.length,
      0,
    );
    assert.equal(
      (await d.query("select * from storage.objects where name=$1", [b.image]))
        .rows.length,
      0,
    );
  });
});
test("ordinary users cannot upload/delete banner media or mutate content; direct role metadata does not help", async () => {
  const b = await reserve();
  await assert.rejects(
    withRole(db, "authenticated", U, (d) =>
      d.query(
        "insert into storage.objects(bucket_id,name) values('store-media',$1)",
        [`banners/${b.id}/${randomUUID()}.jpg`],
      ),
    ),
    (e) => e.code === "42501",
  );
  await withRole(db, "authenticated", U, async (d) => {
    await d.query("delete from storage.objects where name=$1", [b.image]);
  });
  assert.equal(
    (await db.query("select * from storage.objects where name=$1", [b.image]))
      .rows.length,
    1,
  );
  await assert.rejects(
    withRole(db, "anon", null, (d) =>
      write(d, "banner", b.id, b.version, {}, "archive"),
    ),
    (e) => e.code === "42501",
  );
});
test("SEO is locked, canonical never takes an untrusted Preview origin, JSON-LD escapes markup without fabricated offers/reviews", () => {
  assert.equal(indexingEnabled(), false);
  assert.equal(
    canonicalOrigin("https://kos-jeans-git-feat-x.vercel.app"),
    "https://kos-jeans.vercel.app",
  );
  assert.equal(
    canonicalOrigin("javascript:evil"),
    "https://kos-jeans.vercel.app",
  );
  const schema = productSchema(
    {
      name: "</script><script>x</script>",
      sku: "REAL-SKU",
      slug: "real-denim",
      description: "Текст",
    },
    [],
  );
  assert(!("offers" in schema));
  assert(!("aggregateRating" in schema));
  assert(!jsonLd(schema).includes("<"));
});
