import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createTestDatabase, withRole } from "./helpers/database.mjs";
import { checkoutInput } from "../src/lib/checkout/validation.ts";
const P = "20000000-0000-4000-8000-000000000001",
  V = "30000000-0000-4000-8000-000000000001",
  W = "30000000-0000-4000-8000-000000000003",
  SESSION = "a".repeat(64);
let db;
const customer = {
  name: "ТЕСТ Покупець",
  phone: "+380000000001",
  city: "Тестове місто",
  method: "nova_poshta_branch",
  address: "ТЕСТ відділення",
  comment: "",
};
const values = (items = [{ variantId: V, quantity: 1, price: 149900 }]) => ({
  customer,
  items,
});
const submit = (d, key = randomUUID(), v = values(), session = SESSION) =>
  d.query("select public.checkout_submit($1,$2,$3::jsonb) result", [
    key,
    session,
    JSON.stringify(v),
  ]);
async function tx(fn) {
  await db.exec("begin");
  try {
    return await fn(db);
  } finally {
    await db.exec("rollback");
  }
}
before(async () => {
  db = await createTestDatabase();
  await db.exec(
    `update public.products set status='published',published_at=now() where id='${P}';insert into public.product_variants(id,product_id,sku,size,color,stock,is_active) values('${W}','${P}','TEST-CHECKOUT-29','29','Синій',2,true);`,
  );
});
after(() => db.close());
test("checkout validation normalizes phone, strips spoofed totals and rejects unsafe input", () => {
  const v = checkoutInput({
    key: randomUUID(),
    ...values(),
    customer: { ...customer, phone: "(000) 000-00-01" },
    total: 1,
  });
  assert.equal(v.customer.phone, "+380000000001");
  assert(!("total" in v));
  for (const c of [
    { ...customer, name: "<script>" },
    { ...customer, phone: "123" },
    { ...customer, method: "fake" },
    { ...customer, address: "\nunsafe" },
  ])
    assert.throws(() =>
      checkoutInput({ key: randomUUID(), customer: c, items: values().items }),
    );
  assert.throws(() =>
    checkoutInput({
      key: randomUUID(),
      ...values([{ variantId: V, quantity: -1, price: 1 }]),
    }),
  );
});
test("trusted checkout atomically snapshots two variants, computes total and retries once only", () =>
  tx(async (d) => {
    const key = randomUUID(),
      input = values([
        { variantId: V, quantity: 1, price: 149900 },
        { variantId: W, quantity: 2, price: 149900 },
      ]);
    await d.exec("set local role service_role");
    const a = (await submit(d, key, input)).rows[0].result,
      b = (await submit(d, key, input)).rows[0].result;
    assert.deepEqual(a, b);
    assert.equal(a.total, 449700);
    await d.exec("reset role");
    assert.equal(
      (await d.query("select count(*)::int n from public.orders")).rows[0].n,
      1,
    );
    assert.equal(
      (
        await d.query("select stock from public.product_variants where id=$1", [
          V,
        ])
      ).rows[0].stock,
      2,
    );
    assert.equal(
      (
        await d.query("select stock from public.product_variants where id=$1", [
          W,
        ])
      ).rows[0].stock,
      0,
    );
    assert.equal(
      (
        await d.query(
          "select sum(line_total_kopecks)::bigint n from public.order_items",
        )
      ).rows[0].n,
      449700,
    );
    await d.exec(
      "update public.products set name='Changed',price_kopecks=999 where id='" +
        P +
        "';set constraints all immediate",
    );
    assert.equal(
      (
        await d.query(
          "select unit_price_kopecks from public.order_items limit 1",
        )
      ).rows[0].unit_price_kopecks,
      149900,
    );
  }));
test("same key with changed content or session conflicts; unrelated session cannot read receipt", async () => {
  for (const change of ["body", "session"])
    await assert.rejects(
      tx(async (d) => {
        const key = randomUUID();
        await submit(d, key);
        await submit(
          d,
          key,
          change === "body"
            ? values([{ variantId: V, quantity: 2, price: 149900 }])
            : values(),
          change === "session" ? "b".repeat(64) : SESSION,
        );
      }),
      /idempotency conflict/,
    );
  await tx(async (d) => {
    const key = randomUUID();
    await submit(d, key);
    assert.equal(
      (
        await d.query("select public.checkout_status($1,$2) result", [
          key,
          "b".repeat(64),
        ])
      ).rows[0].result,
      null,
    );
    assert(
      (
        await d.query("select public.checkout_status($1,$2) result", [
          key,
          SESSION,
        ])
      ).rows[0].result.number,
    );
  });
});
test("price change requires confirmation and performs no partial stock/order write", () =>
  tx(async (d) => {
    await d.exec(
      "update public.products set price_kopecks=129900 where id='" +
        P +
        "';savepoint changed_price",
    );
    await assert.rejects(submit(d), /price changed/);
    await d.exec("rollback to changed_price");
    assert.equal(
      (await d.query("select count(*)::int n from public.orders")).rows[0].n,
      0,
    );
    assert.equal(
      (
        await d.query("select stock from public.product_variants where id=$1", [
          V,
        ])
      ).rows[0].stock,
      3,
    );
    assert.equal(
      (
        await submit(
          d,
          randomUUID(),
          values([{ variantId: V, quantity: 1, price: 129900 }]),
        )
      ).rows[0].result.total,
      129900,
    );
  }));
test("zero stock, inactive, hidden ancestry, archive and fake UUID cannot create orders", async () => {
  for (const mode of ["stock", "inactive", "hidden", "archive", "fake"])
    await assert.rejects(
      tx(async (d) => {
        if (mode === "stock")
          await d.exec(
            "update public.product_variants set stock=0 where id='" + V + "'",
          );
        if (mode === "inactive")
          await d.exec(
            "update public.product_variants set is_active=false where id='" +
              V +
              "'",
          );
        if (mode === "archive")
          await d.exec(
            "update public.products set status='archived' where id='" + P + "'",
          );
        if (mode === "hidden")
          await d.exec("update public.categories set is_visible=false");
        await submit(
          d,
          randomUUID(),
          values([
            {
              variantId: mode === "fake" ? randomUUID() : V,
              quantity: 1,
              price: 149900,
            },
          ]),
        );
      }),
      /unavailable item/,
    );
});
test("failure after first stock write rolls back the entire statement and snapshots", () =>
  tx(async (d) => {
    await d.exec(
      `create function private.fail_checkout_test() returns trigger language plpgsql as $$begin if new.id='${W}' then raise exception 'forced test failure';end if;return new;end$$;create trigger fail_checkout_test before update on public.product_variants for each row execute function private.fail_checkout_test();savepoint before_failed_order;`,
    );
    await assert.rejects(
      submit(
        d,
        randomUUID(),
        values([
          { variantId: V, quantity: 1, price: 149900 },
          { variantId: W, quantity: 1, price: 149900 },
        ]),
      ),
      /forced test failure/,
    );
    await d.exec("rollback to before_failed_order");
    assert.equal(
      (await d.query("select count(*)::int n from public.orders")).rows[0].n,
      0,
    );
    assert.equal(
      (await d.query("select count(*)::int n from public.order_items")).rows[0]
        .n,
      0,
    );
    assert.deepEqual(
      (
        await d.query(
          "select stock from public.product_variants where id in($1,$2) order by id",
          [V, W],
        )
      ).rows.map((r) => r.stock),
      [3, 2],
    );
  }));
test("order total guard rejects a mismatched aggregate", () =>
  tx(async (d) => {
    await submit(d);
    await d.exec("savepoint invalid_sum");
    await d.exec("update public.orders set total_kopecks=1");
    await assert.rejects(
      d.exec("set constraints all immediate"),
      /order total mismatch/,
    );
    await d.exec("rollback to invalid_sum");
  }));
test("anon and authenticated users cannot invoke trusted checkout or rate RPCs", async () => {
  for (const role of ["anon", "authenticated"]) {
    await assert.rejects(
      withRole(db, role, null, (d) => submit(d)),
      /permission denied/,
    );
    await assert.rejects(
      withRole(db, role, null, (d) =>
        d.query("select public.checkout_status($1,$2)", [
          randomUUID(),
          SESSION,
        ]),
      ),
      /permission denied/,
    );
    await assert.rejects(
      withRole(db, role, null, (d) =>
        d.query("select public.checkout_throttle($1)", [
          ["global:" + SESSION, "ip:" + SESSION, "session:" + SESSION],
        ]),
      ),
      /permission denied/,
    );
  }
});
test("persistent rate limit survives individual requests and saturates without overflow", () =>
  tx(async (d) => {
    await d.exec("set local role service_role");
    const keys = ["global:" + SESSION, "ip:" + SESSION, "session:" + SESSION];
    for (let n = 0; n < 20; n++)
      assert.equal(
        (await d.query("select public.checkout_throttle($1) ok", [keys]))
          .rows[0].ok,
        true,
      );
    assert.equal(
      (await d.query("select public.checkout_throttle($1) ok", [keys])).rows[0]
        .ok,
      false,
    );
  }));
