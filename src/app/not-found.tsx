import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-6 px-6 py-12">
      <p className="text-sm font-semibold tracking-widest">KOS JEANS · 404</p>
      <h1 className="text-4xl font-semibold tracking-tight">Сторінку не знайдено</h1>
      <p className="text-lg leading-8 text-zinc-600">
        Перевірте адресу або поверніться на головну сторінку.
      </p>
      <Link href="/" className="w-fit underline underline-offset-4">
        На головну
      </Link>
    </main>
  );
}
