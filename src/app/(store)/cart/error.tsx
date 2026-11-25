"use client";
import Link from "next/link";
export default function CartError({ reset }: { reset: () => void }) {
  return (
    <main id="main-content" className="mx-auto max-w-store px-page py-16">
      <p className="text-xs text-muted">KOS JEANS / Кошик</p>
      <h1 className="mt-5 text-heading">Кошик тимчасово недоступний</h1>
      <p className="mt-5 text-sm leading-7 text-muted">
        Збережений вибір залишається у вашому браузері. Перевірте з’єднання та
        повторіть спробу.
      </p>
      <button onClick={reset} className="mt-8 min-h-12 bg-ink px-6 text-paper">
        Спробувати знову
      </button>
      <Link href="/catalog" className="ml-5 underline">
        До каталогу
      </Link>
    </main>
  );
}
