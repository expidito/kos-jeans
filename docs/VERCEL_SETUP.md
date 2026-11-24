# KOS JEANS: Vercel — блок 02

Дата: 2026-11-23 (Europe/Vienna). Статус: `done`.

## Адреса

- Публичный сайт: **https://kos-jeans.vercel.app** — без входа в Vercel.
- [Проект Vercel](https://vercel.com/fedir-team/kos-jeans).
- [Репозиторий GitHub](https://github.com/expidito/kos-jeans).
- [Первая production-публикация](https://vercel.com/fedir-team/kos-jeans/GHrwkuRanYYQzurr1uCjxmJBLo6L):
  `main`, SHA `b6f8589`, Ready.
- [Проверенный автоматический preview](https://vercel.com/fedir-team/kos-jeans/5XPTzEAR4zFRdtVCykrBi18gqL2X):
  ветка `feat/block-02-vercel-preview`, SHA `5054ccf`, Ready.
- [Preview-ссылка](https://kos-jeans-o8ujl62md-fedir-team.vercel.app) может требовать
  входа в Vercel. Для просмотра с любого устройства используйте публичный сайт.

## Как публикуются изменения

Vercel Git Integration связан с `expidito/kos-jeans`.

1. Разработка и push выполняются в feature-ветку.
2. GitHub Actions запускает `npm ci`, lint, typecheck и build.
3. Vercel автоматически создаёт Preview Deployment. Ссылка доступна в PR,
   в статусе Vercel у коммита и в разделе Deployments проекта.
4. Владелец проверяет изменения и подтверждает слияние PR.
5. После merge в `main` Git Integration запускает production-публикацию,
   обновляющую стабильный адрес https://kos-jeans.vercel.app.

Первая production-сборка запущена вручную через Create Deployment с Git
reference `main`, поскольку создание проекта не запустило её автоматически.
Для автоматического preview выполнен настоящий push `5054ccf`, без ручного
создания deployment; Vercel и GitHub Actions завершились успешно.
Первый production-триггер на новом push будет проверен при следующем
одобренном слиянии в `main`.

## Настройки сборки

- Команда: `Fedir Team`, проект `kos-jeans`, существующий репозиторий GitHub.
- Framework: Next.js; Root Directory: корень (`./`).
- Production Branch: `main`; остальные feature-ветки — Preview.
- `vercel.json`: `installCommand: npm ci`, `buildCommand: npm run build`.
  Конфигурация проверена в preview и попадёт в production после merge PR блока 02.
- Output Directory: стандартный для Next.js.
- В настройках Vercel сейчас Node.js 26.x; диапазон `engines.node` приложения
  `>=24 <27` его поддерживает. CI использует Node.js 24 из `.nvmrc`.
- Платные функции, Pro Trial и on-demand concurrent builds не активировались.
- Защита preview оставлена штатной; публичный production доступен без авторизации.

## Переменные окружения

Каркас собирается без ключей и без `.env.local`. Supabase не подключался.
В Vercel не добавлялись фиктивные или пустые Supabase-ключи.

Когда соответствующий функционал будет реализован, значения задаются в
Project Settings → Environment Variables отдельно для Production и Preview:

| Переменная | Окружение и назначение |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Для Production: `https://kos-jeans.vercel.app`; сейчас каркас не использует переменную |
| `NEXT_PUBLIC_SUPABASE_URL` | Адрес соответствующей БД, начиная с блока 05 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Публичный ключ с RLS, отдельно для каждого окружения |
| `SUPABASE_SERVICE_ROLE_KEY` | Только серверный секрет; никогда не передавать в браузер |

Preview должен использовать тестовую БД, изолированную от production.
Не переносить реальные ключи в Git или документацию. Названия без значений
есть в `.env.example`; `.env.local` и `.vercel/` исключены из Git.
После изменения переменных требуется новый deployment для их применения.

## Проверки

Проверено без cookies и авторизации через системный curl с обычной проверкой TLS:
главная HTTPS 200, украинский контент, сообщение о разработке, `noindex, nofollow`,
CSS 200 и украинская страница 404 с правильным HTTP-статусом.
Production визуально проверен в Chrome. Vercel вернул `Deployment has completed`
для main и проверенного preview; CI feature-ветки прошёл.
Поле Website репозитория GitHub указывает на реальный публичный адрес.

Это ранняя тестовая публикация: каталог, админка и заказы ещё не реализованы.
Блок 03 не начинается без отдельного подтверждения владельца.

## Официальные инструкции

- [Git deployments](https://vercel.com/docs/git)
- [Vercel for GitHub](https://vercel.com/docs/git/vercel-for-github)
- [Deployment environments](https://vercel.com/docs/deployments/environments)
