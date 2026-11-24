# KOS JEANS

Интернет-магазин одежды для Украины. Интерфейс — на украинском языке,
валюта — гривна (UAH / ₴); документация — на русском.

## Текущее состояние

Создан публичный репозиторий: [expidito/kos-jeans](https://github.com/expidito/kos-jeans).
В блоке 01 создан каркас приложения: украинская стартовая страница с пометкой
«Сайт у розробці», страница 404, TypeScript, ESLint и CI.
Стартовая страница опубликована: **[kos-jeans.vercel.app](https://kos-jeans.vercel.app)**.
Vercel связан с GitHub; автоматическая production-публикация merge PR #2 проверена.
Supabase пока не подключён.
Каталог, админка и заказы ещё не реализованы. Проект не готов к торговле.

PR #1 слит в `main` с разрешения владельца. Блок 02 выполнен в ветке
`feat/block-02-vercel-preview`: production из `main`, автоматический preview
из feature-ветки и успешный CI проверены.
[Адреса и порядок публикации](docs/VERCEL_SETUP.md).

- [Техническое задание и порядок работы](AGENTS.md)
- [Прогресс по блокам](PROJECT_PROGRESS.md)

Разработка выполняется строго по одному блоку за команду. После отчёта
работа останавливается до сообщения владельца «Работу над блоком окончено».
Блок 03 добавляет собственную дизайн-систему ([PR #3](https://github.com/expidito/kos-jeans/pull/3), пока не слит). Следующий блок — 04,
публичная оболочка и главная страница; он не начат.

## Стек

Next.js 16.4.6 (App Router), React 19.3.1, TypeScript 6.0.3, Tailwind CSS 4.3.5,
ESLint 9.39.5 и GitHub Actions. Версии закреплены в `package.json` и
`package-lock.json`. TypeScript 7 и ESLint 10 пока не используются из-за
ограничений совместимости линтеров.
Supabase (PostgreSQL, Auth, Storage, RLS), Zod и Vercel подключаются в следующих блоках.

## Локальная работа

Рабочая папка — корень этого репозитория; вложенную папку `kos-jeans` создавать
не нужно. Рекомендуется Node.js 24 LTS (версия указана в `.nvmrc`), npm.
Допустимый диапазон Node.js указан в `package.json`; CI использует Node.js 24.

```bash
# Если установлен nvm:
nvm install
nvm use

# Установка из lock-файла и запуск:
npm ci
npm run dev
```

Открыть [http://localhost:3000](http://localhost:3000).
Библиотека дизайн-системы: [http://localhost:3000/design-system](http://localhost:3000/design-system).
Для текущего каркаса переменные окружения не нужны.
Остановить сервер: `Ctrl+C` в его терминале.

Проверки и production-сборка:

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

`typecheck` сначала генерирует типы маршрутов Next.js, затем запускает
`tsc --noEmit`, поэтому работает и до первой сборки. ESLint вызывается
напрямую; предупреждения приводят к неуспешному завершению.
`npm start` запускает уже готовую production-сборку на том же порту 3000.
Не запускайте dev и production одновременно на одном порту.
Автоматических тестов бизнес-логики пока нет, команды `npm test` тоже нет.

## Структура

```text
src/
  app/
    (store)/page.tsx           # Главная /, группа не добавляется к URL
    globals.css               # Tailwind и базовые стили
    layout.tsx                # Корневой layout, язык uk, metadata
    not-found.tsx             # Украинская страница 404
  components/
    development-notice.tsx     # Сообщение о тестовом состоянии
.github/workflows/ci.yml       # npm ci → lint → typecheck → build
```

## Дизайн-система (блок 03)

- [UX-анализ Spazio и решения KOS JEANS](docs/REFERENCE_AND_UX.md).
- [Палитра, типографика, сетка, компоненты и доступность](docs/DESIGN_SYSTEM.md).
- `src/styles/tokens.css` — семантические Tailwind/CSS-токены.
- `src/components/ui/` — Button, Badge, TextField, SizeSelector, Price, Breadcrumbs и Accordion.
- `/design-system` — украинская адаптивная библиотека с рабочими образцами.
- [Vercel Preview дизайн-системы](https://kos-jeans-git-feat-block-03-ux-design-system-fedir-team.vercel.app/design-system) (может потребоваться вход в Vercel).
- Превью в репозитории: [desktop](docs/previews/design-system-desktop.jpg), [mobile](docs/previews/design-system-mobile.jpg).

Шрифт Manrope поставляется локально через `@fontsource-variable/manrope`
(лицензия OFL-1.1, кириллица), не требует доступа к Google Fonts при сборке.
Векторные иллюстрации созданы для проекта; демонстрационные карточки не являются
реальными товарами. Категории в компонентах не зашиты: контракты будущего
дерева и меню описаны в UX-документе. Главная магазина остаётся блоком 04.

Компоненты серверные по умолчанию. Клиентские компоненты добавляются только
для интерактивности. Новые страницы — в `src/app`, общие компоненты —
в `src/components`; alias `@/*` ссылается на `src/*`.
Дерево категорий не зашито в каркас. Фотографии и внешние запросы шрифтов
не используются: сборка не требует доступа к сервисам шрифтов.
Стартовая версия помечена `noindex, nofollow` до этапа настройки SEO.

## CI

GitHub Actions выполняет чистую установку, lint, проверку типов и сборку
для push в `main`, `feat/**`, `fix/**`, `chore/**`, а также для PR в `main`.
Есть ручной запуск `workflow_dispatch`. Workflow использует Node.js 24,
права только на чтение кода; секреты для проверок каркаса не нужны.
Проверки локально выполняются теми же npm-командами.

## Состояние Git

Проверить состояние репозитория:

```bash
git status --short --branch
git remote -v
```

## Переменные окружения

`.env.example` содержит только пустые значения. Когда начнётся подключение
сервисов, скопируйте его в локальный файл:

```bash
cp .env.example .env.local
```

| Переменная | Назначение |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Реальный адрес сайта после публикации |
| `NEXT_PUBLIC_SUPABASE_URL` | URL соответствующего Supabase-проекта |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Публичный ключ Supabase; доступ ограничивается RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Секретный серверный ключ, только для защищённых серверных операций |

Реальные ключи не хранить в Git, документации или клиентском коде.
`.env.local` и остальные `.env.*` исключены из Git, кроме `.env.example`.
В Vercel значения добавляются в настройках проекта → Environment Variables;
для Preview и Production нужно использовать соответствующие изолированные
окружения. Vercel подключён в блоке 02; Supabase будет подключён в блоке 05.

## Git и публикация

Первая публикация блока 00 — в `main`. Дальнейшие изменения:
feature-ветка → проверки → commit → push → PR/preview → merge после
подтверждения владельца. Force push и удаление чужих данных запрещены без
отдельного разрешения.

GitHub хранит код. Стартовая версия доступна на [Vercel](https://kos-jeans.vercel.app). После реализации админки ассортимент и остатки будут изменяться
через `/admin` без commit, push и deployment.
