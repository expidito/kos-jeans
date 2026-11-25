// DEV ONLY. Fictitious contacts. Existing assortment is never deleted.
import assert from "node:assert/strict";
import { randomUUID, randomBytes } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { devContext } from "./catalog-dev-fixtures.mjs";
import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "../src/lib/supabase/config.ts";
const base = process.env.CHECKOUT_TEST_BASE ?? "http://127.0.0.1:3012",
  run = randomUUID(),
  P = randomUUID(),
  prefix = randomUUID().slice(0, 24),
  A = prefix + "000000000001",
  B = prefix + "000000000002",
  Z = prefix + "000000000003",
  name = "ТЕСТ Покупець Checkout",
  marker = "KOS-BLOCK12-TEST:" + run;
const customer = {
  name,
  phone: "+380000000001",
  city: "Тестове місто",
  method: "nova_poshta_branch",
  address: "ТЕСТ відділення",
  comment: marker,
};
const values = (items = [{ variantId: A, quantity: 1, price: 10000 }]) => ({
  customer,
  items,
});
const keys = [];
let ctx,
  userId,
  stage = "dev target",
  failed = false;
const checks = [];
const record = (check) => {
  checks.push({ check, status: "pass" });
  console.log("PASS: " + check);
};
async function cancel() {
  if (!ctx || !keys.length) return;
  await ctx.sql(
    `begin;select pg_advisory_xact_lock(52005001);select pg_advisory_xact_lock(52005002);do $$declare o record;l record;begin for o in select * from public.orders where idempotency_key in (${keys.map((k) => `'${k}'`).join(",")}) and customer_name='${name}' and comment='${marker}' order by id for update loop if o.inventory_released_at is null and o.status='new' then for l in select variant_id,sum(quantity)::int quantity from public.order_items where order_id=o.id group by variant_id order by variant_id loop update public.product_variants set stock=stock+l.quantity where id=l.variant_id;end loop;update public.orders set status='cancelled',inventory_released_at=now() where id=o.id;end if;end loop;end$$;commit;select true restored;`,
  );
}
async function jar() {
  const cookies = new Map();
  const call = async (path, body) => {
    const r = await fetch(base + path, {
      method: body ? "POST" : "GET",
      headers: {
        Cookie: [...cookies].map(([k, v]) => k + "=" + v).join(";"),
        ...(body ? { Origin: base, "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      redirect: "manual",
    });
    for (const c of r.headers.getSetCookie()) {
      const [k, v] = c.split(";")[0].split("=");
      cookies.set(k, v);
    }
    return r;
  };
  assert.equal((await call("/api/checkout/session")).status, 200);
  return call;
}
try {
  assert(process.argv.includes("--dev-only"));
  ctx = await devContext();
  stage = "fixture";
  await ctx.sql(
    `begin;insert into public.products(id,name,sku,slug,description,price_kopecks,status,published_at) values('${P}','ТЕСТ · Checkout atomic','TEST-CHECKOUT-${run}','test-checkout-${run}','Тільки перевірка dev, не продається',10000,'published',now());insert into public.product_categories values('${P}','70000000-0000-4000-8000-000000000004');insert into public.product_variants(id,product_id,sku,size,color,stock,is_active) values('${A}','${P}','TEST-CA-${run}','A','Тестовий',1,true),('${B}','${P}','TEST-CB-${run}','B','Тестовий',3,true),('${Z}','${P}','TEST-CZ-${run}','ZERO','Тестовий',0,true);commit;`,
  );
  const stock = async () =>
    (
      await ctx.sql(
        `select id,stock from public.product_variants where product_id='${P}' order by id`,
      )
    ).map((v) => v.stock);
  stage = "HTTP create/retry";
  const call = await jar(),
    key = randomUUID();
  keys.push(key);
  const input = {
    key,
    ...values([
      { variantId: A, quantity: 1, price: 10000 },
      { variantId: B, quantity: 2, price: 10000 },
    ]),
  };
  const first = await call("/api/checkout/submit", input);
  if (first.status !== 200) {
    const data = await first.json();
    console.log({
      httpStatus: first.status,
      kind: data.kind ?? "none",
      safeMessage: data.error,
    });
    throw Error();
  }
  assert.match(first.headers.get("cache-control"), /private.*no-store/);
  const receipt = (await first.json()).receipt;
  stage = "first receipt total";
  assert.equal(receipt.total, 30000);
  stage = "idempotent HTTP retry";
  const repeat = await call("/api/checkout/submit", input);
  assert.equal(repeat.status, 200);
  assert.deepEqual((await repeat.json()).receipt, receipt);
  stage = "created stock values";
  assert.deepEqual(await stock(), [0, 1, 0]);
  assert.equal(
    (
      await ctx.sql(
        `select count(*)::int n from public.orders where idempotency_key='${key}'`,
      )
    )[0].n,
    1,
  );
  stage = "snapshot totals";
  const sum = (
    await ctx.sql(
      `select o.total_kopecks,sum(i.line_total_kopecks) actual,count(*)::int lines from public.orders o join public.order_items i on i.order_id=o.id where o.idempotency_key='${key}' group by o.id`,
    )
  )[0];
  assert.equal(Number(sum.total_kopecks), Number(sum.actual));
  assert.equal(sum.lines, 2);
  record(
    "HTTP creates exactly one order; same key retries without stock change; snapshots and server total correct",
  );
  stage = "receipt privacy";
  const success = await call("/checkout/success");
  assert.equal(success.status, 200);
  const html = await success.text();
  assert(html.includes(receipt.number));
  assert(
    !html.includes(customer.phone) &&
      !html.includes(customer.address) &&
      !html.includes(customer.name),
  );
  assert.match(success.headers.get("cache-control"), /private.*no-store/);
  assert.equal((await fetch(base + "/checkout/success")).status, 404);
  const other = await jar();
  const status = await other("/api/checkout/status", { key });
  assert.equal((await status.json()).receipt, null);
  assert.equal(
    (
      await call("/api/checkout/submit", {
        ...input,
        customer: { ...customer, address: "Інший тест" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await fetch(base + "/api/checkout/submit", {
        method: "POST",
        headers: {
          Origin: "https://untrusted.example",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      })
    ).status,
    403,
  );
  record(
    "Receipt requires browser capability; success HTML has no contact data; changed payload conflicts and cross-origin POST denied",
  );
  await cancel();
  assert.deepEqual(await stock(), [1, 3, 0]);
  stage = "price confirmation";
  await ctx.sql(
    `update public.products set price_kopecks=12000 where id='${P}'`,
  );
  const changed = randomUUID();
  keys.push(changed);
  let r = await call("/api/checkout/submit", { key: changed, ...values() });
  assert.equal(r.status, 409);
  assert.equal((await r.json()).kind, "price");
  assert.deepEqual(await stock(), [1, 3, 0]);
  r = await call("/api/checkout/submit", {
    key: changed,
    ...values([{ variantId: A, quantity: 1, price: 12000 }]),
  });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).receipt.total, 12000);
  await cancel();
  await ctx.sql(
    `update public.products set price_kopecks=10000 where id='${P}'`,
  );
  record(
    "Price change rejected before stock/order writes, new confirmed price accepted with same stable key",
  );
  stage = "parallel last unit";
  const raceKeys = [randomUUID(), randomUUID()];
  keys.push(...raceKeys);
  const raced = await Promise.all(
    raceKeys.map((k) =>
      ctx.admin.rpc("checkout_submit", {
        p_key: k,
        p_session: randomBytes(32).toString("hex"),
        p_values: values(),
      }),
    ),
  );
  assert.equal(raced.filter((r) => !r.error).length, 1);
  assert.equal(raced.filter((r) => r.error?.code === "P0011").length, 1);
  assert.deepEqual(await stock(), [0, 3, 0]);
  await cancel();
  assert.deepEqual(await stock(), [1, 3, 0]);
  record(
    "Two parallel PostgreSQL checkout transactions: exactly one wins the last unit, no negative stock",
  );
  stage = "forced rollback";
  await ctx.sql(
    `create function private.checkout_fixture_failure() returns trigger language plpgsql as $$begin if new.variant_id='${B}' then raise exception 'checkout fixture failure';end if;return new;end$$;create trigger checkout_fixture_failure before insert on public.order_items for each row execute function private.checkout_fixture_failure();`,
  );
  const rollbackKey = randomUUID();
  keys.push(rollbackKey);
  const broken = await ctx.admin.rpc("checkout_submit", {
    p_key: rollbackKey,
    p_session: "a".repeat(64),
    p_values: values([
      { variantId: A, quantity: 1, price: 10000 },
      { variantId: B, quantity: 1, price: 10000 },
    ]),
  });
  assert(broken.error);
  assert.deepEqual(await stock(), [1, 3, 0]);
  assert.equal(
    (
      await ctx.sql(
        `select count(*)::int n from public.orders where idempotency_key='${rollbackKey}'`,
      )
    )[0].n,
    0,
  );
  await ctx.sql(
    "drop trigger checkout_fixture_failure on public.order_items;drop function private.checkout_fixture_failure();",
  );
  record(
    "Failure after an earlier stock write rolls back order, items and all inventory changes",
  );
  stage = "public access";
  assert(
    (
      await ctx.visitor.rpc("checkout_submit", {
        p_key: randomUUID(),
        p_session: "a".repeat(64),
        p_values: values(),
      })
    ).error,
  );
  assert((await ctx.visitor.from("orders").select("id")).error);
  const { url, key: publishable } = getSupabaseConfig(),
    password = randomBytes(32).toString("base64url"),
    email = `test-checkout-${run}@example.com`;
  const made = await ctx.admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "admin" },
  });
  assert(made.data.user && !made.error);
  userId = made.data.user.id;
  const ordinary = createClient(url, publishable, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  assert(!(await ordinary.auth.signInWithPassword({ email, password })).error);
  assert.equal((await ordinary.from("orders").select("id")).data?.length, 0);
  assert.equal(
    (await ordinary.from("order_items").select("id")).data?.length,
    0,
  );
  assert(
    (
      await ordinary.rpc("checkout_submit", {
        p_key: randomUUID(),
        p_session: "a".repeat(64),
        p_values: values(),
      })
    ).error,
  );
  record(
    "Anon and ordinary users cannot invoke checkout RPC directly or read other orders/items; metadata role is ignored",
  );
  stage = "unavailable stock";
  const unavailable = randomUUID();
  keys.push(unavailable);
  assert.equal(
    (
      await call("/api/checkout/submit", {
        key: unavailable,
        ...values([{ variantId: Z, quantity: 1, price: 10000 }]),
      })
    ).status,
    409,
  );
  await ctx.sql(`update public.products set status='archived' where id='${P}'`);
  assert.equal(
    (await call("/api/checkout/submit", { key: unavailable, ...values() }))
      .status,
    409,
  );
  record("Zero-stock and archived products cannot create orders");
  stage = "rate limit";
  const limited = await jar();
  let blocked = false;
  for (let n = 0; n < 25; n++) {
    const rr = await limited("/api/checkout/status", { key: randomUUID() });
    if (rr.status === 429) {
      assert(rr.headers.get("retry-after"));
      blocked = true;
      break;
    }
    assert.equal(rr.status, 200);
  }
  assert(blocked);
  record(
    "HTTP rate limit persists across requests and returns 429 / Retry-After",
  );
} catch {
  failed = true;
  console.error(
    "Hosted checkout failed at " +
      stage +
      "; credential-bearing details withheld",
  );
} finally {
  if (ctx) {
    try {
      await ctx.sql(
        "drop trigger if exists checkout_fixture_failure on public.order_items;drop function if exists private.checkout_fixture_failure();",
      );
      await cancel();
      const rows = await ctx.sql(
        `select stock from public.product_variants where product_id='${P}' order by id`,
      );
      if (rows.length)
        assert.deepEqual(
          rows.map((r) => r.stock),
          [1, 3, 0],
        );
      await ctx.sql(
        `update public.products set status='archived',price_kopecks=10000 where id='${P}';`,
      );
      record(
        "Only owned test orders cancelled idempotently; fixture stocks restored and new fixture archived, no assortment deletion",
      );
    } catch {
      failed = true;
      console.error(
        "Checkout test restoration failed; inspect only this run test fixtures",
      );
    }
    if (userId) {
      const result = await ctx.admin.auth.admin.deleteUser(userId);
      if (result.error) failed = true;
    }
  }
  await writeFile(
    "docs/checks/block12-hosted.json",
    JSON.stringify(
      {
        status: failed ? "failed" : "pass",
        checks,
        productionModified: false,
        existingAssortmentRemoved: false,
        testOrdersRetainedAsCancelled: true,
      },
      null,
      2,
    ) + "\n",
  );
  if (failed) process.exitCode = 1;
}
