import { test } from "node:test";
import assert from "node:assert/strict";
import {
  cartInput,
  storedCart,
  increased,
  resolveRows,
  cartTotal,
} from "../src/lib/cart/model.ts";
const A = "30000000-0000-4000-8000-000000000001",
  B = "30000000-0000-4000-8000-000000000002",
  P = "20000000-0000-4000-8000-000000000001";
const v = (extra = {}) => ({
  id: A,
  product_id: P,
  size: "26",
  color: "Синій",
  stock: 3,
  is_active: true,
  products: { id: P, name: "ТЕСТ", slug: "test", price_kopecks: 129900 },
  ...extra,
});
test("storage keeps only valid IDs and quantities; malformed, oversized and negative carts rejected", () => {
  const items = [{ variantId: A, quantity: 1, price: 1, name: "Fake" }];
  assert.deepEqual(storedCart(JSON.stringify({ version: 1, items })), [
    { variantId: A, quantity: 1 },
  ]);
  for (const items of [
    [{ variantId: "fake", quantity: 1 }],
    [{ variantId: A, quantity: 0 }],
    [{ variantId: A, quantity: -1 }],
    [{ variantId: A, quantity: 1.1 }],
    [{ variantId: A, quantity: 100 }],
    [
      { variantId: A, quantity: 1 },
      { variantId: A, quantity: 1 },
    ],
    Array(51).fill({ variantId: A, quantity: 1 }),
  ])
    assert.throws(() => cartInput(items));
  assert.deepEqual(storedCart("broken"), []);
  assert.deepEqual(storedCart('{"version":2,"items":[]}'), []);
});
test("same variant merges, distinct sizes remain separate and aggregate cannot exceed stock", () => {
  let items = increased([], A, 1, 3);
  items = increased(items, B, 2, 5);
  assert.equal(items.length, 2);
  assert.equal(
    items.reduce((s, i) => s + i.quantity, 0),
    3,
  );
  items = increased(items, A, 1, 3);
  assert.equal(items.length, 2);
  assert.equal(items[0].quantity, 2);
  assert.throws(() => increased(items, A, 2, 3));
  assert.throws(() => increased([], A, 1, 0));
  assert.throws(() => increased([], "invalid", 1, 99));
});
test("resolved server values override client data and integer totals are exact", () => {
  const rows = resolveRows(
    cartInput([
      { variantId: A, quantity: 1, price: 1 },
      { variantId: B, quantity: 2 },
    ]),
    [v(), v({ id: B, size: "27" })],
    [{ id: "image", product_id: P }],
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].price, 129900);
  assert.equal(rows[0].imageId, "image");
  assert.equal(rows[1].size, "27");
  assert.equal(cartTotal(rows), 389700);
  const changed = resolveRows(
    [{ variantId: A, quantity: 3 }],
    [v({ products: { ...v().products, price_kopecks: 149900 } })],
    [],
  );
  assert.equal(cartTotal(changed), 449700);
});
test("short stock is explicit; unavailable or absent variants never reveal cached metadata", () => {
  assert.equal(
    resolveRows([{ variantId: A, quantity: 4 }], [v()], [])[0].status,
    "shortage",
  );
  for (const variants of [[], [v({ is_active: false })]])
    assert.deepEqual(
      resolveRows([{ variantId: A, quantity: 1 }], variants, []),
      [{ variantId: A, quantity: 1, status: "unavailable" }],
    );
  const zero = resolveRows(
    [{ variantId: A, quantity: 1 }],
    [v({ stock: 0 })],
    [],
  );
  assert.equal(zero[0].status, "unavailable");
  assert.equal(cartTotal(zero), 0);
});
