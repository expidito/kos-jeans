# Vercel: текущая публикация и окружения

Проверено 2026-11-26, блок16. Настройки Production не изменялись.

- [Production](https://kos-jeans.vercel.app) — публичный безопасный сайт.
- [Проект](https://vercel.com/fedir-team/kos-jeans),
  [GitHub](https://github.com/expidito/kos-jeans).
- Production Branch: `main`. PR15 слит с разрешения; main `e71f98a802648a8983e40e6a3ed744c8b16f64ff`.
  [Ready Deployment](https://vercel.com/fedir-team/kos-jeans/5BrRKKCHQ2vUN4zt5zkCgpJmQGG6)
  подтверждён в GitHub status и Vercel Project Overview (Current Production).
- Изменения блока16 — отдельный PR/Preview. Его Production-публикация не разрешена
  автоматически: только после нового подтверждения merge, затем повторный GET-smoke.

## Публикация кода

Feature-ветка → push → GitHub Actions и Vercel Preview → проверка владельцем →
разрешённый merge в main → Production Deployment. Источник кода — GitHub Integration.
`vercel.json`: npm ci / npm run build, корневая папка проекта. CI Node24 из `.nvmrc`;
диапазон приложения24–26 поддерживает существующий Vercel Node26.
Preview может требовать Vercel SSO; это ожидаемая защита, не ошибка сайта.
Не отключать защиту и не публиковать bypass-token ради внешнего smoke.

## Проверенные переменные, без значений

| Переменная | Local Development | Vercel Preview | Vercel Production сейчас |
| --- | --- | --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | Есть в игнорируемом .env.local, dev | Есть, только Preview | Не назначена Production |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Есть, проверен публичный формат | Есть, только Preview | Не назначена Production |
| SUPABASE_CHECKOUT_SECRET_KEY | Есть, server only | Есть, только Preview | Не назначена Production |
| NEXT_PUBLIC_SITE_URL | Не задана; безопасный canonical fallback | Не задана в наблюдаемом списке | Не задана в наблюдаемом списке; fallback на действующий адрес |
| VERCEL_ENV | Локально отсутствует | Системное preview | Системное production |

Dashboard показал три Supabase записи с областью Preview и без branch labels.
Значения не открывались/не копировались. Local-файл не принадлежит облачному
Development scope: наличие локального ключа не означает добавления его в Vercel.
[Метаданные](checks/launch/vercel-environments.json),
[локальная проверка](checks/launch/local-environment.json).

Production изолирован **дважды**: dev-переменные не назначены Production, а код
publicCatalogClient/adminConfigured/checkoutAvailable запрещает работу при
VERCEL_ENV=production даже при случайном наличии dev-значений.
Не менять/подделывать VERCEL_ENV. Серверный checkout secret не имеет NEXT_PUBLIC prefix,
публичное чтение каталога использует publishable key и RLS.

Само добавление будущих prod env не разблокирует магазин: нужен отдельно reviewed
переход [SUPABASE_PRODUCTION.md](SUPABASE_PRODUCTION.md). Никаких новых переключателей
реальных заказов в этом блоке не добавлено. После изменения env нужен новый deploy;
предыдущий deployment не получает их автоматически.

## Auth и адреса

Dev Auth Site URL localhost:3000, redirect allowlist пуст — read-only проверка Dashboard.
Текущая email/password server-авторизация возвращает в /admin того же HTTP host,
logout — /admin/login; произвольный return URL не принимается. Origin проверяется.
Email recovery/OAuth callback не реализованы. Для будущей рабочей базы Site URL и
точные redirect URLs согласуются отдельно по [DOMAIN_SETUP.md](DOMAIN_SETUP.md).

## Резервный возврат и тариф

При неудачной публикации не включать checkout: сравнить SHA/логи и вернуть ранее
проверенную публикацию только после согласования. Rollback кода не откатывает БД.
Не менять env и не запускать SQL/очистку, чтобы замаскировать ошибку сборки.

Перед коммерческим использованием проверить действующий тариф. Если это Hobby,
он ограничен личным некоммерческим использованием; тариф/расходы нужно согласовать.
[Официальные условия Hobby](https://vercel.com/docs/plans/hobby).
Текущий тариф не объявляется автоматически подходящим для торговли; upgrade не выполнялся.
