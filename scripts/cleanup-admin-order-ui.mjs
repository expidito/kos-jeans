// Trusted, exact-marker DEV teardown. Shipped fixture restoration is not a public transition.
import { devContext } from "./catalog-dev-fixtures.mjs";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
try {
  assert(process.argv.includes("--dev-only"));
  const c = await devContext();
  await c.sql(`begin;select pg_advisory_xact_lock(52005001);select pg_advisory_xact_lock(52005002);
 do $$declare o record;i record;begin
 for o in select * from public.orders where customer_name='ТЕСТ Покупець Orders' and customer_phone='+380000000013' and comment in ('KOS-BLOCK13-UI-SHIPPED','KOS-BLOCK13-UI-CANCELLED') and checkout_session_hash is not null order by id for update loop
 if o.inventory_released_at is null then
 for i in select variant_id,product_id,sum(quantity)::int quantity from public.order_items where order_id=o.id group by variant_id,product_id order by variant_id loop
 if i.product_id is distinct from '8b3a7092-584b-4c5e-a8ec-dfe7a04256fd'::uuid then raise exception 'unexpected fixture product';end if;
 update public.product_variants set stock=stock+i.quantity where id=i.variant_id and product_id=i.product_id;
 if not found then raise exception 'missing original fixture variant';end if;
 end loop;
 update public.orders set status='cancelled',inventory_released_at=now() where id=o.id;
 end if;end loop;end$$;commit;select true restored;`);
  const stocks = await c.sql(
    "select size,stock from public.product_variants where product_id='8b3a7092-584b-4c5e-a8ec-dfe7a04256fd' order by size",
  );
  assert.deepEqual(
    stocks.map((v) => v.stock),
    [3, 5, 0, 2, 4],
  );
  const product = (
    await c.sql(
      "select price_kopecks,old_price_kopecks,status,(select count(*)::int from public.product_images where product_id=p.id) photos from public.products p where id='8b3a7092-584b-4c5e-a8ec-dfe7a04256fd'",
    )
  )[0];
  assert.deepEqual(product, {
    price_kopecks: 129900,
    old_price_kopecks: 149900,
    status: "published",
    photos: 5,
  });
  const orders = await c.sql(
    "select order_number,status,inventory_released_at is not null released from public.orders where customer_name='ТЕСТ Покупець Orders' and customer_phone='+380000000013' and comment in ('KOS-BLOCK13-UI-SHIPPED','KOS-BLOCK13-UI-CANCELLED') order by order_number",
  );
  assert.equal(orders.length, 2);
  assert(orders.every((o) => o.status === "cancelled" && o.released));
  await writeFile(
    "docs/checks/block13-ui-restored.json",
    JSON.stringify(
      {
        status: "pass",
        stocks,
        product,
        orders,
        exactMarkersOnly: true,
        historyRetained: true,
        existingAssortmentRemoved: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: exact owned UI fixtures restored once; baseline price, stocks and five photos intact",
  );
} catch {
  console.error(
    "UI order restoration failed; credential-bearing details withheld",
  );
  process.exitCode = 1;
}
