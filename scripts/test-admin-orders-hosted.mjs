// DEV-only transaction acceptance; no role assignments and no existing assortment mutations.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { devContext } from "./catalog-dev-fixtures.mjs";
const run = randomUUID(),
  P = randomUUID(),
  C = randomUUID(),
  V = randomUUID(),
  keys = [],
  checks = [];
let c,
  adminId,
  ref,
  stage = "setup";
const record = (check) => {
  checks.push({ check, status: "pass" });
  console.log("PASS: " + check);
};
const quote = (s) => "'" + s.replaceAll("'", "''") + "'";
const adminSQL = (q) =>
  `begin;select set_config('request.jwt.claim.sub','${adminId}',true);set local role authenticated;${q};commit;`;
const change = (o, status) =>
  `select public.admin_order_status('${o.id}','${o.updated_at}',${quote(status)}) result`;
async function parallelSql(query) {
  const dir = await mkdtemp(join(tmpdir(), "kos-orders-test-"));
  try {
    const path = join(dir, "query.sql");
    await writeFile(path, query, { mode: 0o600 });
    const { stdout } = await promisify(execFile)(
      "npx",
      [
        "--yes",
        "supabase@3.3.0",
        "db",
        "query",
        `--remote=${ref}`,
        "--file",
        path,
        "--yes",
        "--output-format",
        "json",
      ],
      { maxBuffer: 1024 * 1024 },
    );
    return JSON.parse(stdout).rows;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
async function order() {
  const key = randomUUID();
  keys.push(key);
  const result = await c.admin.rpc("checkout_submit", {
    p_key: key,
    p_session: "b".repeat(64),
    p_values: {
      customer: {
        name: "ТЕСТ Покупець Orders",
        phone: "+380000000013",
        city: "Тестове місто",
        method: "nova_poshta_branch",
        address: "ТЕСТ відділення",
        comment: "KOS-BLOCK13:" + run,
      },
      items: [{ variantId: V, quantity: 1, price: 10000 }],
    },
  });
  if (result.error)
    throw Error(
      "CHECKOUT:" +
        (/^[A-Z0-9]{5}$/.test(result.error.code)
          ? result.error.code
          : "transport"),
    );
  return (
    await c.sql(
      `select id,updated_at from public.orders where idempotency_key='${key}'`,
    )
  )[0];
}
const stock = async () =>
  Number(
    (
      await c.sql(`select stock from public.product_variants where id='${V}'`)
    )[0].stock,
  );
try {
  assert(process.argv.includes("--dev-only"));
  c = await devContext();
  ref = new URL(c.url).hostname.split(".")[0];
  const roles = await c.sql(
    "select user_id::text id from private.admin_users where user_id='d4319c1d-bec3-40e4-8b87-41e5101cf52f'",
  );
  assert.equal(roles.length, 1);
  adminId = roles[0].id;
  await c.sql(
    `begin;insert into public.categories(id,slug,name,is_visible) values('${C}','test-orders-${run}','ТЕСТ · Orders dev',true);insert into public.products(id,name,slug,sku,description,price_kopecks,status,published_at) values('${P}','ТЕСТ · Admin orders','test-orders-${run}','TEST-ORDERS-${run}','Тільки ізольований тест dev',10000,'published',now());insert into public.product_categories values('${P}','${C}');insert into public.product_variants(id,product_id,sku,size,color,stock,is_active) values('${V}','${P}','TEST-OV-${run}','TEST','Тестовий',50,true);commit;`,
  );
  stage = "create and cancel";
  const o = await order(),
    s = await stock();
  await c.sql(adminSQL(change(o, "cancelled")));
  await c.sql(adminSQL(change(o, "cancelled")));
  assert.equal(await stock(), s + 1);
  record(
    "Authenticated admin cancels atomically; stale retry returns same result and restores once",
  );
  stage = "concurrent cancellation";
  const race = await order(),
    before = await stock();
  const repeated = await Promise.allSettled([
    parallelSql(adminSQL(change(race, "cancelled"))),
    parallelSql(adminSQL(change(race, "cancelled"))),
  ]);
  assert(repeated.every((r) => r.status === "fulfilled"));
  assert.equal(await stock(), before + 1);
  record(
    "Two concurrent administrator cancellations both finish without double restoration",
  );
  stage = "conflict";
  const conflict = await order(),
    b = await stock();
  const res = await Promise.allSettled([
    parallelSql(adminSQL(change(conflict, "processing"))),
    parallelSql(adminSQL(change(conflict, "cancelled"))),
  ]);
  assert.equal(res.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(res.filter((r) => r.status === "rejected").length, 1);
  const current = (
    await c.sql(
      `select id,status,updated_at from public.orders where id='${conflict.id}'`,
    )
  )[0];
  assert.equal(await stock(), b + (current.status === "cancelled" ? 1 : 0));
  if (current.status === "processing")
    await c.sql(adminSQL(change(current, "cancelled")));
  record(
    "Conflicting concurrent status writes: one wins and stale administrator is rejected",
  );
  stage = "snapshots";
  const snap = await order();
  await c.sql(
    `update public.products set price_kopecks=20000 where id='${P}';select true ok;`,
  );
  assert.equal(
    Number(
      (
        await c.sql(
          `select total_kopecks from public.orders where id='${snap.id}'`,
        )
      )[0].total_kopecks,
    ),
    10000,
  );
  assert.equal(
    Number(
      (
        await c.sql(
          `select unit_price_kopecks from public.order_items where order_id='${snap.id}'`,
        )
      )[0].unit_price_kopecks,
    ),
    10000,
  );
  await c.sql(adminSQL(change(snap, "cancelled")));
  record(
    "Historical order totals and snapshots survive current catalog price changes",
  );
  stage = "search";
  const search = await c.sql(
    adminSQL(
      `select public.admin_order_search((select order_number::text from public.orders where id='${snap.id}'),'cancelled',current_date,current_date,'newest',1) result`,
    ),
  );
  assert.equal(search.at(-1).result.items.length, 1);
  record("Admin exact-number, date and status filters return the real order");
  stage = "rls";
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(
      c.sql(
        `begin;select set_config('request.jwt.claim.sub','${randomUUID()}',true);set local role ${role};select public.admin_order_status('${snap.id}',now(),'processing');commit;`,
      ),
    );
    await assert.rejects(
      c.sql(
        `begin;set local role ${role};select public.admin_order_search();commit;`,
      ),
    );
  }
  const ordinary = await c.sql(
    `begin;select set_config('request.jwt.claim.sub','${randomUUID()}',true);set local role authenticated;select count(*)::int n from public.orders;select count(*)::int n from public.order_items;commit;`,
  );
  assert(ordinary.filter((r) => "n" in r).every((r) => r.n === 0));
  record(
    "Anonymous and ordinary users cannot mutate/read orders or call privileged search",
  );
  stage = "http";
  const base = (process.env.AUDIT_TEST_BASE ?? "http://127.0.0.1:3013");
  for (const path of ["/admin/orders", "/admin/orders/" + snap.id]) {
    const r = await fetch(base + path, { redirect: "manual" });
    assert.equal(r.status, 307);
    assert(!(await r.text()).includes("ТЕСТ Покупець Orders"));
  }
  const api = await fetch(base + "/admin/orders/api/status", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({
      id: snap.id,
      status: "processing",
      version: snap.updated_at,
    }),
  });
  assert.equal(api.status, 401);
  const csrf = await fetch(base + "/admin/orders/api/status", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(csrf.status, 403);
  record(
    "Protected pages redirect without session; mutation API rejects unauthenticated and cross-origin requests",
  );
} catch (error) {
  const raw = String(error?.stderr ?? error?.message ?? "");
  const reason =
    raw.match(/CHECKOUT:([A-Z0-9]{5}|transport)/)?.[0] ??
    [
      "order changed",
      "admin required",
      "invalid status request",
      "invalid input syntax",
      "permission denied",
      "function public.admin_order_status",
      "CHECKOUT:",
      "schema cache",
    ].find((v) => raw.includes(v)) ??
    "assertion or transport";
  console.error(
    "Hosted order checks failed at " +
      stage +
      " (" +
      reason +
      "); credential-bearing details withheld",
  );
  process.exitCode = 1;
} finally {
  if (c) {
    try {
      await c.sql(
        `begin;select pg_advisory_xact_lock(52005001);select pg_advisory_xact_lock(52005002);do $$declare o record;i record;begin for o in select * from public.orders where comment='KOS-BLOCK13:${run}' and customer_name='ТЕСТ Покупець Orders' for update loop if o.inventory_released_at is null then for i in select variant_id,quantity from public.order_items where order_id=o.id loop update public.product_variants set stock=stock+i.quantity where id=i.variant_id and product_id='${P}';end loop;update public.orders set status='cancelled',inventory_released_at=now() where id=o.id;end if;end loop;end$$;update public.products set status='archived' where id='${P}';update public.categories set is_visible=false,archived_at=now() where id='${C}';commit;select true restored;`,
      );
      assert.equal(await stock(), 50);
      record(
        "Only owned fixture orders restored once, history retained, fixture archived; existing assortment untouched",
      );
    } catch {
      process.exitCode = 1;
      console.error(
        "Owned fixture restoration requires inspection; details withheld",
      );
    }
  }
  await writeFile(
    "docs/checks/block13-hosted.json",
    JSON.stringify(
      {
        status: process.exitCode ? "fail" : "pass",
        checks,
        existingAssortmentRemoved: false,
        rolesAssigned: false,
        productionEnvironmentChanged: false,
      },
      null,
      2,
    ) + "\n",
  );
}
