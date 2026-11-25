import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import { devContext } from "./catalog-dev-fixtures.mjs";
const base = process.env.CART_TEST_BASE ?? "http://127.0.0.1:3011";
let stage = "dev target";
const checks = [];
const record = (check) => {
  checks.push({ check, status: "pass" });
  console.log("PASS: " + check);
};
try {
  assert(process.argv.includes("--dev-only"));
  const ctx = await devContext();
  const product = "8b3a7092-584b-4c5e-a8ec-dfe7a04256fd";
  const original = await ctx.sql(
    `select id,size,stock from public.product_variants where product_id='${product}' order by size`,
  );
  const orders = (await ctx.sql("select count(*)::int n from public.orders"))[0]
    .n;
  const post = async (items) => {
    const r = await fetch(base + "/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });
    return { r, body: await r.json() };
  };
  const id = (size) => original.find((v) => v.size === size).id;
  stage = "variant resolution";
  let result = await post([
    { variantId: id("26"), quantity: 1, price: 1 },
    { variantId: id("27"), quantity: 2 },
  ]);
  assert.equal(result.r.status, 200);
  assert.match(result.r.headers.get("cache-control"), /no-store/);
  assert.equal(result.body.rows.length, 2);
  assert(result.body.rows.every((r) => r.status === "available"));
  assert.equal(result.body.rows[0].price, 129900);
  assert(result.body.rows[0].imageId);
  assert.equal(
    result.body.rows.reduce((n, r) => n + r.quantity * r.price, 0),
    389700,
  );
  record(
    "Real variants, sizes, current price and cover resolved anonymously; spoofed price ignored; total 389700 kopecks",
  );
  stage = "shortage";
  result = await post([
    { variantId: id("26"), quantity: 4 },
    { variantId: id("28"), quantity: 1 },
  ]);
  assert.equal(result.body.rows[0].status, "shortage");
  assert.equal(result.body.rows[1].status, "unavailable");
  record(
    "Requested count above stock is shortage; zero-stock size is unavailable",
  );
  stage = "RLS";
  const hidden = await ctx.sql(
    "select v.id from public.product_variants v where product_id in ('80000000-0000-4000-8000-000000000014','80000000-0000-4000-8000-000000000015','80000000-0000-4000-8000-000000000016')",
  );
  result = await post([
    ...hidden.map((v) => ({ variantId: v.id, quantity: 1 })),
    { variantId: "11111111-1111-4111-8111-111111111111", quantity: 1 },
  ]);
  assert.equal(result.body.rows.length, hidden.length + 1);
  for (const row of result.body.rows) {
    assert.equal(row.status, "unavailable");
    assert.deepEqual(Object.keys(row).sort(), [
      "quantity",
      "status",
      "variantId",
    ]);
  }
  record(
    "Draft, archived, hidden-category and nonexistent variants expose no product metadata or images",
  );
  stage = "invalid cart";
  for (const quantity of [0, -1, 1.5, 100])
    assert.equal(
      (await post([{ variantId: id("26"), quantity }])).r.status,
      422,
    );
  assert.equal(
    (await post([{ variantId: "fake", quantity: 1 }])).r.status,
    422,
  );
  assert.equal(
    (await post(Array(51).fill({ variantId: id("26"), quantity: 1 }))).r.status,
    422,
  );
  record(
    "Malformed IDs, nonpositive/fractional/excessive quantities and oversized carts rejected",
  );
  stage = "no mutation";
  assert.deepEqual(
    await ctx.sql(
      `select id,size,stock from public.product_variants where product_id='${product}' order by size`,
    ),
    original,
  );
  assert.equal(
    (await ctx.sql("select count(*)::int n from public.orders"))[0].n,
    orders,
  );
  record(
    "Resolving and adding cart data creates no orders and changes no stock",
  );
  await writeFile(
    "docs/checks/block11-hosted.json",
    JSON.stringify(
      {
        status: "pass",
        checks,
        productionModified: false,
        dataModified: false,
      },
      null,
      2,
    ) + "\n",
  );
} catch {
  console.error(
    "Cart hosted check failed at " +
      stage +
      "; credential-bearing details withheld",
  );
  process.exitCode = 1;
}
