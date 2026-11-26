# KOS JEANS

Магазин одежды для Украины: украинский интерфейс, гривна (₴), собственная
минималистичная дизайн-система. Техническая документация — на русском.

## Состояние

**[Публичный сайт — kos-jeans.vercel.app](https://kos-jeans.vercel.app)** работает
в безопасном режиме подготовки. Каталог Production пуст, dev-база не подключена,
рабочая админка/checkout и индексация отключены. Это не действующий коммерческий магазин.
Информационные страницы — явно помеченные черновики, без выдуманных реквизитов.

В local/Preview с `kos-jeans-dev` реализованы и проверены настоящий каталог,
категории/фильтры/варианты, private фото, корзина, тестовое атомарное оформление и
отмена, защищённая админка, товары/склад/контент. Блок15 прошёл сквозную приёмку.
Блок16 завершает подготовку документации и окружений; отдельная prod-база и домен ещё не создавались.
[Отчёт и ограничения](docs/LAUNCH_PREPARATION_REPORT.md).

- [Preview блока16](https://kos-jeans-git-feat-block-16-launch-preparation-fedir-team.vercel.app) · [PR #16](https://github.com/expidito/kos-jeans/pull/16)
- [GitHub](https://github.com/expidito/kos-jeans)
- [Vercel project](https://vercel.com/fedir-team/kos-jeans)
- [Supabase Dashboard](https://supabase.com/dashboard/projects)
- [Прогресс](PROJECT_PROGRESS.md) · [Техническое задание](AGENTS.md)

## Владельцу

1. [Как войти и управлять магазином](docs/OWNER_GUIDE.md).
2. [Что уже готово, что предоставить и что запрещено включать](docs/LAUNCH_CHECKLIST.md).
3. [Подключение домена](docs/DOMAIN_SETUP.md).
4. [Будущий kos-jeans-prod: миграции, роль и резервирование](docs/SUPABASE_PRODUCTION.md).
5. [Окружения и публикации Vercel](docs/VERCEL_SETUP.md).

Изменения товаров в подключённой базе не требуют commit/deploy. Изменения дизайна
идут через feature-ветку → проверки/PR/Preview → подтверждение владельца → main.
Production-публикация блока16 допустима только после отдельного согласования merge.
Она не означает разрешение принимать реальные заказы или включать индексацию.

## Разработка

Next.js16.4.6 App Router, React19.3.1, TypeScript6.0.3, Tailwind4.3.5,
Supabase Auth/PostgreSQL/RLS/Storage, Vercel и GitHub Actions. Версии фиксируются
package-lock. Node24LTS из `.nvmrc`; engines поддерживает24–26.
Рабочая папка — корень этого репозитория, вложенную kos-jeans создавать не нужно.

```bash
npm ci
npm run dev
```

[Localhost](http://localhost:3000), [дизайн-система](http://localhost:3000/design-system).
Для dev данных скопировать `.env.example` в `.env.local` и заполнить самостоятельно.
Настоящие значения не отправлять в чат/Git. Публичный fallback работает без ключей.

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:production-mode
npm start
```

В среде, запрещающей внутренний порт Turbopack, обычный локальный build может
завершиться OS error1 при PostCSS. Альтернатива: `npm run build -- --webpack`.
CI/Vercel используют обычный build; их результат проверяется отдельно. Не отключать
lint/тесты ради успешной сборки.

## Безопасные проверки подготовки запуска

```bash
npm run launch:check:production
npm run launch:check:env
```

Первый скрипт делает только GET-запросы к действующему публичному сайту и его JS:
HTTPS, страницы/404, SEO/noindex, отсутствие dev credentials, отключённые admin/checkout.
Не создаёт заказы и не пишет в БД. При будущем домене можно передать `LAUNCH_ORIGIN`
только для этого CLI smoke, это не настройка приложения.
Второй требует локальный `.env.local` и авторизацию Supabase CLI; проверяет присутствие
переменных/игнорирование Git/dev target/ledger без значений ключей и изменений БД.
Результаты — `docs/checks/launch/`.
`test:production-mode` после сборки запускает локальный Next на loopback3020,
проверяет пустую главную и отключённые Auth/checkout, затем останавливает сервер.
Эта регрессия также включена в CI. В PR16 главная Production больше не подставляет
демоцены при отключённой БД; текущая публикация main до разрешения merge16 ещё
содержит явно подписанные статические иллюстрации раннего макета.

В package.json есть hosted проверки прошлых блоков. Они создают TEST fixtures,
поэтому допускаются **только в подтверждённом kos-jeans-dev** с прочитанным сценарием
восстановления. Не запускать seed, cleanup, scale или hosted order tests на Production.
`tests/helpers/supabase-platform.sql` — только PGlite.

## Техническая документация

- [Supabase и ограничения истории dev-миграций](docs/SUPABASE_SETUP.md)
- [Аудит качества/безопасности](docs/QUALITY_AND_SECURITY_AUDIT.md)
- [Каталог](docs/CATALOG.md) · [товар](docs/PRODUCT_DETAIL.md) · [корзина](docs/SHOPPING_CART.md)
- [Оформление](docs/CHECKOUT.md) · [заказы](docs/ADMIN_ORDERS.md)
- [Auth](docs/ADMIN_AUTH.md) · [категории](docs/ADMIN_CATEGORIES.md) · [товары](docs/ADMIN_PRODUCTS.md)
- [Контент/SEO](docs/CONTENT_AND_SEO.md) · [источники изображений](docs/IMAGE_SOURCES.md)
- [UX-референс](docs/REFERENCE_AND_UX.md) · [дизайн-система](docs/DESIGN_SYSTEM.md)

`.env.local`, токены, `.vercel`, backups, дампы и персональные данные не коммитятся.
Три Supabase env сейчас ограничены Preview; в Production их нет. Даже случайное
добавление dev env не включает доступ: каталог/Auth/checkout запрещены кодом в Production.
Отключение этих ограничений и `indexingEnabled()` — отдельный проверяемый PR после
письменного разрешения. Платные услуги, домен, DNS и новые prod-ключи не подключаются автоматически.
