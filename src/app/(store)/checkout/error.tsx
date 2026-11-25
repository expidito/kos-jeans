"use client";
import Link from "next/link";
export default function CheckoutError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="mx-auto max-w-store px-page py-20">
      <h1 className="text-heading">Не вдалося відкрити оформлення</h1>
      <p className="mt-5 text-sm leading-7">
        Якщо запит уже відправлено, поверніться до оформлення й перевірте його
        стан. Не створюйте новий запит до перевірки попереднього.
      </p>
      <button onClick={reset} className="mt-7 min-h-12 bg-ink px-6 text-paper">
        Спробувати ще раз
      </button>
      <Link href="/checkout" className="ml-5 underline">
        До оформлення
      </Link>
    </main>
  );
}
