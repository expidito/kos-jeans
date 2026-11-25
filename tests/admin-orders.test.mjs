import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTestDatabase, withRole } from "./helpers/database.mjs";
import { orderFilters, transitions } from "../src/lib/admin/orders/policy.ts";
const A = "10000000-0000-4000-8000-000000000001",
  U = "10000000-0000-4000-8000-000000000002",
  P = "20000000-0000-4000-8000-000000000001",
  V = "30000000-0000-4000-8000-000000000001";
let db;
before(async () => {
  db = await createTestDatabase();
  await db.exec(
    `insert into auth.users(id) values('${A}'),('${U}');insert into private.admin_users values('${A}',now());update public.product_variants set stock=100 where id='${V}';update public.products set status='published',published_at=now() where id='${P}';`,
  );
});
after(() => db.close());
async function admin(fn) {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [A]);
    await db.exec("set local role authenticated");
    const result = await fn(db);
    await db.exec("commit");
    return result;
  } catch (e) {
    await db.exec("rollback");
    throw e;
  }
}
async function order(price = 149900) {
  const { rows } = await db.query(
    "select public.checkout_submit($1,$2,$3::jsonb)",
    [
      randomUUID(),
      "a".repeat(64),
      JSON.stringify({
        customer: {
          name: "ТЕСТ Покупець",
          phone: "+380000000001",
          city: "Тестове місто",
          method: "nova_poshta_branch",
          address: "Тестове відділення",
          comment: "TEST-ORDERS",
        },
        items: [{ variantId: V, price, quantity: 1 }],
      }),
    ],
  );
  assert(rows.length);
  return (
    await db.query(
      "select id,updated_at from public.orders order by order_number desc limit 1",
    )
  ).rows[0];
}
const change = (d, o, status, version = o.updated_at) =>
  d.query("select public.admin_order_status($1,$2,$3) result", [
    o.id,
    version,
    status,
  ]);
async function tx(fn) {
  await db.exec("begin");
  try {
    return await fn();
  } finally {
    await db.exec("rollback");
  }
}
test("orders filters validate dates, statuses, exact numbers and bound pagination", () => {
  assert.deepEqual(
    orderFilters({
      number: "#12",
      from: "2026-02-30",
      status: "evil",
      page: "0",
    }),
    { number: "12", from: "", to: "", status: "", sort: "newest", page: 1 },
  );
  assert.equal(orderFilters({ from: "2026-11-25", to: "2026-11-24" }).to, "");
  assert.equal(transitions.cancelled.length, 0);
  assert(!transitions.shipped.includes("cancelled"));
});
test("verified admin sees order snapshots; normal user and anon cannot read or invoke mutation/search", async () => {
  const o = await order();
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(
      withRole(db, role, U, (d) => change(d, o, "cancelled")),
      (e) => e.code === "42501",
    );
    await assert.rejects(
      withRole(db, role, U, (d) =>
        d.query("select public.admin_order_search()"),
      ),
      (e) => e.code === "42501",
    );
  }
  const rows = await admin((d) =>
    d.query("select public.admin_order_search($1) result", ["1"]),
  );
  assert.equal(rows.rows[0].result.items.length, 1);
  await withRole(db, "authenticated", U, async (d) => {
    assert.equal((await d.query("select * from public.orders")).rows.length, 0);
    assert.equal(
      (await d.query("select * from public.order_items")).rows.length,
      0,
    );
  });
  await assert.rejects(
    admin((d) =>
      d.query("update public.orders set status='cancelled' where id=$1", [
        o.id,
      ]),
    ),
    (e) => e.code === "42501",
  );
});
test("cancel atomically restores exactly once; retry stale version no-op and terminal order cannot reopen", async () => {
  const o = await order();
  const before = (
    await db.query("select stock from public.product_variants where id=$1", [V])
  ).rows[0].stock;
  await admin((d) => change(d, o, "cancelled"));
  await admin((d) => change(d, o, "cancelled"));
  assert.equal(
    (
      await db.query("select stock from public.product_variants where id=$1", [
        V,
      ])
    ).rows[0].stock,
    before + 1,
  );
  const current = (
    await db.query("select * from public.orders where id=$1", [o.id])
  ).rows[0];
  assert(current.inventory_released_at);
  await assert.rejects(
    admin((d) => change(d, o, "processing", current.updated_at)),
    (e) => e.code === "23514",
  );
});
test("status transitions reject stale writes and invalid jumps, shipped is not cancellable", async () => {
  const o = await order();
  await assert.rejects(
    admin((d) => change(d, o, "shipped")),
    (e) => e.code === "23514",
  );
  const next = (await admin((d) => change(d, o, "processing"))).rows[0].result;
  await assert.rejects(
    admin((d) => change(d, o, "cancelled")),
    (e) => e.code === "40001",
  );
  const shipped = (await admin((d) => change(d, o, "shipped", next.version)))
    .rows[0].result;
  await assert.rejects(
    admin((d) => change(d, o, "cancelled", shipped.version)),
    (e) => e.code === "23514",
  );
  await admin((d) => change(d, o, "completed", shipped.version));
});
test("forced error after restoration rolls back order and stock together", async () => {
  const o = await order();
  const stock = (
    await db.query("select stock from public.product_variants where id=$1", [V])
  ).rows[0].stock;
  await db.exec(
    "create function private.test_order_failure() returns trigger language plpgsql as $$begin if new.status='cancelled' then raise exception 'test failure';end if;return new;end$$;create trigger test_order_failure before update on public.orders for each row execute function private.test_order_failure();",
  );
  try {
    await assert.rejects(admin((d) => change(d, o, "cancelled")));
    assert.equal(
      (
        await db.query(
          "select stock from public.product_variants where id=$1",
          [V],
        )
      ).rows[0].stock,
      stock,
    );
    assert.equal(
      (await db.query("select status from public.orders where id=$1", [o.id]))
        .rows[0].status,
      "new",
    );
  } finally {
    await db.exec(
      "drop trigger test_order_failure on public.orders;drop function private.test_order_failure();",
    );
  }
});
test("snapshots survive price edits; archived variants restore; deleted variants never guessed or recreated", async () => {
  await tx(async () => {
    const o = await order();
    await db.exec(
      `update public.products set price_kopecks=999900,status='archived' where id='${P}';`,
    );
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [A]);
    await change(db, o, "cancelled");
    assert.equal(
      (
        await db.query(
          "select unit_price_kopecks from public.order_items where order_id=$1",
          [o.id],
        )
      ).rows[0].unit_price_kopecks,
      149900,
    );
  });
  await tx(async () => {
    const o = await order();
    await db.query("delete from public.product_variants where id=$1", [V]);
    await db.query("select set_config('request.jwt.claim.sub',$1,true)", [A]);
    const result = (await change(db, o, "cancelled")).rows[0].result;
    assert.equal(result.missingVariants, 1);
    assert.equal(
      (await db.query("select * from public.product_variants where id=$1", [V]))
        .rows.length,
      0,
    );
    assert.equal(
      (
        await db.query(
          "select product_name from public.order_items where order_id=$1",
          [o.id],
        )
      ).rows.length,
      1,
    );
  });
});

test("order search combines Kyiv dates/status, sorts totals and paginates deterministically", async () => {
  const ids = [];
  for (let i = 0; i < 22; i++) {
    const price = 10000 + i * 100;
    await db.query("update public.products set price_kopecks=$1 where id=$2", [
      price,
      P,
    ]);
    const o = await order(price);
    ids.push(o.id);
    await db.query(
      "update public.orders set created_at='2001-01-01T10:00:00Z'::timestamptz + $1 * interval '1 minute' where id=$2",
      [i, o.id],
    );
  }
  const search = async (sort, page) =>
    (
      await admin((d) =>
        d.query(
          "select public.admin_order_search('','new','2001-01-01','2001-01-01',$1,$2) result",
          [sort, page],
        ),
      )
    ).rows[0].result;
  const first = await search("total_asc", 1),
    second = await search("total_asc", 2);
  assert.equal(first.total, 22);
  assert.equal(first.items.length, 20);
  assert.equal(second.items.length, 2);
  assert.equal(
    new Set([...first.items, ...second.items].map((o) => o.id)).size,
    22,
  );
  assert.equal(first.items[0].total_kopecks, 10000);
  assert.equal(second.items[1].total_kopecks, 12100);
  assert.equal((await search("newest", 1)).items[0].id, ids[21]);
  assert.equal((await search("oldest", 1)).items[0].id, ids[0]);
  const outside = await admin((d) =>
    d.query(
      "select public.admin_order_search('','new','2001-01-02','2001-01-02') result",
    ),
  );
  assert.equal(outside.rows[0].result.total, 0);
});
