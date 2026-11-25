// Trusted DEV-only test teardown, not a public cancellation endpoint or block 13 UI.
import { devContext } from "./catalog-dev-fixtures.mjs";
import { writeFile } from "node:fs/promises";
try {
  if (!process.argv.includes("--dev-only")) throw Error();
  const marker = process.argv.find((v) => v.startsWith("--marker="))?.slice(9);
  if (!marker || !/^KOS-BLOCK12-UI-[A-Z0-9-]{1,60}$/.test(marker))
    throw Error();
  const c = await devContext();
  const result = await c.sql(
    `begin;select pg_advisory_xact_lock(52005001);select pg_advisory_xact_lock(52005002);do $$declare o record;i record;begin for o in select * from public.orders where customer_name='ТЕСТ Покупець Checkout' and customer_phone='+380000000001' and comment='${marker}' and checkout_session_hash is not null order by id for update loop if o.status='new' and o.inventory_released_at is null then for i in select variant_id,sum(quantity)::int quantity from public.order_items where order_id=o.id group by variant_id order by variant_id loop update public.product_variants set stock=stock+i.quantity where id=i.variant_id;end loop;update public.orders set status='cancelled',inventory_released_at=now() where id=o.id;end if;end loop;end$$;commit;select count(*)::int orders,count(*) filter(where status='cancelled' and inventory_released_at is not null)::int restored from public.orders where customer_name='ТЕСТ Покупець Checkout' and customer_phone='+380000000001' and comment='${marker}';`,
  );
  const counts = result.at(-1);
  if (counts.orders !== counts.restored) throw Error();
  await writeFile(
    "docs/checks/block12-ui-restored.json",
    JSON.stringify(
      {
        status: "pass",
        testOrders: counts.orders,
        cancelled: counts.restored,
        inventoryRestored: true,
        existingAssortmentRemoved: false,
        repeatSafe: true,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    "PASS: only exact owned UI test marker cancelled; inventory released once; order history retained",
  );
} catch {
  console.error("UI test restoration failed; details withheld");
  process.exitCode = 1;
}
