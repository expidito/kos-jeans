import { DevelopmentNotice } from "@/components/development-notice";

export default function HomePage() {
  return (
    <main
      id="main-content"
      className="mx-auto flex min-h-svh max-w-6xl flex-col justify-between gap-16 px-6 py-8 sm:px-12 sm:py-12"
    >
      <p className="text-xl font-bold tracking-[0.16em]">KOS JEANS</p>

      <div className="max-w-3xl py-12 sm:py-20">
        <p className="mb-6 text-xs font-semibold tracking-[0.2em] text-zinc-600 uppercase">
          Сайт у розробці
        </p>
        <h1 className="text-5xl leading-[1.05] font-semibold tracking-tight sm:text-7xl">
          Починаємо з основи.
        </h1>
        <p className="mt-8 max-w-xl text-lg leading-8 text-zinc-600">
          Створюємо інтернет-магазин KOS JEANS. Тут з’являться одяг,
          улюблений денім та нові колекції.
        </p>
      </div>

      <DevelopmentNotice />
    </main>
  );
}
