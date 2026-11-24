"use client";
export default function AdminError({ reset }: { reset: () => void }) {
  return <section role="alert"><h1 className="text-2xl font-medium">Не вдалося завантажити панель</h1><p className="mt-3 text-sm text-muted">Спробуйте ще раз. Якщо сесія завершилася, увійдіть повторно.</p><button onClick={reset} className="mt-6 min-h-12 border border-control px-5 text-sm">Спробувати ще раз</button></section>;
}
