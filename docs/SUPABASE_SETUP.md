# Supabase: состояние и безопасная работа

Проверено 2026-11-26. Подключён и проверен **kos-jeans-dev**, Free, для local/Preview.
`kos-jeans-prod` не создан/не подключён. Production сейчас не обращается к dev.
Будущая процедура — [SUPABASE_PRODUCTION.md](SUPABASE_PRODUCTION.md).

## Локальная разработка

Создать `.env.local` по `.env.example`, заполнить dev URL и publishable key,
для тестового checkout также server-only secret. Файл игнорируется Git.
Не помещать ключи/пароль БД в публичные файлы, NEXT_PUBLIC secret, PR или скриншоты.
Supabase CLI3.3.0 уже авторизован в рабочей среде; если авторизация истекла,
владелец выполняет `npx --yes supabase@3.3.0 login` в своём терминале.
Пароль/токен вводится только непосредственно в сервис/скрытый prompt, не в чат.

Local не задаёт VERCEL_ENV; Preview получает системное preview. Production получает
системное production и запрещён кодом для текущих каталога/Auth/checkout.
Publishable key не даёт DDL и не заменяет RLS. Не подменять системный environment.

## Девять миграций и история

Имена/порядок9 файлов приведены в [production инструкции](SUPABASE_PRODUCTION.md).
Они создают схему, Storage, каталог, категории, товары, checkout, заказы,
контент и защиту блока15. Все9 применяются в PGlite автоматических тестах;
реальная dev-схема проверена hosted/сквозной приёмкой блока15.

Read-only аудит блока16 нашёл **6 зарегистрированных версий в dev CLI ledger**:
до20261125000600 включительно. Последние3 ранее выполнялись SQL и отсутствуют в ledger.
Это нельзя скрывать или исправлять повторным запуском CREATE: перед следующим dev push
нужна отдельная сверка схемы/истории и согласованное repair только доказанно применённых
версий. В блоке16 история не менялась, миграции не применялись.
[Фактический отчёт](checks/launch/local-environment.json).

Для новой пустой prod-базы использовать все9 файлов через штатный CLI push с явным
новым ref, dry-run и проверкой владельцем; не копировать ledger/schema dump dev.
`supabase/seed.sql`, fixture/cleanup npm-скрипты и `tests/helpers/supabase-platform.sql`
предназначены только для изолированных тестов, никогда для production.

## Данные и права

| Таблица | Назначение |
| --- | --- |
| categories | UUID, parent_id, slug/history, порядок, видимость, архив; защита циклов |
| products | SKU/slug, описание/состав/характеристики, цена/старая цена, публикация/флаги |
| product_categories | Связи товара с несколькими категориями |
| product_images | Private path, alt, порядок/главное фото |
| product_variants | Отдельные SKU, размер/цвет, активность и stock≥0 |
| orders/order_items | Номер, идемпотентность, контакты/доставка, ценовые снимки, сумма/статус/возврат |
| store_settings/homepage_banners | Проверенный публичный контент, видимость, даты и ссылки |
| private.admin_users | Серверная административная роль, не user_metadata |

Цены — целые копейки, totals bigint в безопасном JS диапазоне. FK/unique/check,
отложенная проверка суммы заказа и атомарное списание/отмена защищают данные.
Публичный клиент читает только допустимый опубликованный каталог через RLS;
обычный пользователь не меняет цены/stock и не читает чужие заказы.
Администратор работает через серверную проверку Auth и специализированные RPC,
а не произвольные прямые UPDATE заказов. Checkout secret доступен лишь серверу
тестового окружения. `private` не добавлять в Exposed schemas.

## Фотографии

Private bucket `store-media`, MIME JPEG/PNG/WebP; bucket5MiB, форма≤3MiB и32MP.
Пути/загрузка/удаление проверяются RLS и ролью. Новые файлы WebP без EXIF.
Черновые/архивные фото не выдаются посетителю; public media проверяет metadata и
Storage доступ, private/no-store. Next optimizer не принимает private media URL.
Заменённые файлы очищаются по существующей безопасной очереди, а не массовым удалением.

## Auth и администратор

Публичная регистрация отключена. В dev Site URL localhost:3000, redirect allowlist
пуст; настройки read-only проверены в Dashboard. Password login обрабатывается
Next-сервером и возвращает на /admin того же сайта. Email recovery/OAuth flow не готов.
Роль владельца уже проверена в dev; в prod нужна новая учётная запись и отдельное
подтверждение её UUID. [Вход](ADMIN_AUTH.md), [инструкция владельца](OWNER_GUIDE.md).

## Проверки и резервирование

`npm test` — локальные изолированные SQL/валидационные проверки; hosted scripts
в package.json могут создавать и восстанавливать собственные TEST fixtures только
после подтверждения kos-jeans-dev. **Не запускать их на Production.**
Блок16 использует только чтение конфигурации и GET-smoke Production.
[Аудит15](QUALITY_AND_SECURITY_AUDIT.md), [план запуска](LAUNCH_CHECKLIST.md).

Backups PostgreSQL не включают файлы Storage; схема в Git не является копией данных.
Для Free нужны согласованный off-site export и проверка восстановления, либо
отдельное решение о платных backup-возможностях. Они не включались в этом блоке.
[Официальные backups](https://supabase.com/docs/guides/platform/backups).
В панели dev наблюдалось предупреждение о высоком CPU; тариф/compute не менялись.
Оно не относится к изолированному от dev публичному Production.
