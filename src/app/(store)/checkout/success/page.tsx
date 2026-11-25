import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  checkoutConfigured,
  checkoutClient,
  hash,
  SESSION_COOKIE,
  RECEIPT_COOKIE,
} from "@/lib/checkout/server";
import { validKey, type Receipt } from "@/lib/checkout/validation";
import { formatPrice } from "@/lib/format-price";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Замовлення підтверджено",
  robots: { index: false, follow: false },
};
export default async function SuccessPage() {
  if (!checkoutConfigured()) notFound();
  const jar = await cookies(),
    key = jar.get(RECEIPT_COOKIE)?.value,
    token = jar.get(SESSION_COOKIE)?.value;
  if (!validKey(key) || !token || !/^[a-f0-9]{64}$/.test(token)) notFound();
  const result = await checkoutClient().rpc("checkout_status", {
    p_key: key,
    p_session: hash("session:" + token),
  });
  if (result.error) throw Error("Confirmation unavailable");
  if (!result.data) notFound();
  const receipt = result.data as unknown as Receipt;
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto max-w-3xl px-page py-20"
    >
      <Link href="/" className="text-2xl font-extrabold">
        KOS JEANS /
      </Link>
      <p className="mt-16 mb-4 text-xs tracking-widest text-denim">
        ТЕСТОВЕ ЗАМОВЛЕННЯ ЗБЕРЕЖЕНО
      </p>
      <h1 className="text-heading">Дякуємо за замовлення!</h1>
      <p className="mt-6 text-xl">
        Ваше замовлення №<strong data-order-number>{receipt.number}</strong>{" "}
        успішно оформлено.
      </p>
      <p className="mt-4 text-sm">
        Вартість товарів: {formatPrice(receipt.total)}
      </p>
      <p className="mt-7 text-sm leading-8 text-muted">
        Це тестове оформлення в середовищі розробки. Онлайн-оплата не
        проводилася. Умови оплати, доставки й подальшої обробки будуть визначені
        перед запуском магазину.
      </p>
      <p className="mt-4 text-xs leading-7 text-muted">
        Повторне відкриття цієї сторінки не створює нового замовлення.
        Підтвердження доступне лише в цьому браузері.
      </p>
      <Link
        href="/catalog"
        className="mt-9 inline-flex min-h-12 items-center bg-ink px-6 text-paper"
      >
        Повернутися до каталогу ↗
      </Link>
    </main>
  );
}
