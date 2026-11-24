# Каталог KOS JEANS — блок 06

Статус блока **done**. Локальная реализация, hosted-проверки и реальный Vercel Preview
проверены. Env добавлены владельцем только для Preview; Production не подключён к dev.
[PR #6](https://github.com/expidito/kos-jeans/pull/6),
[Preview каталога](https://kos-jeans-git-feat-block-06-real-catalog-fedir-team.vercel.app/catalog).

Маршруты: `/catalog`, `/catalog/<slug>`, `/media/<image UUID>`.
Украинский интерфейс, UAH, noindex. Детальная страница товара — блок 07;
карточки пока не выдают несуществующую ссылку или кнопку покупки.

## Данные и обновление

Server Components читают Supabase через stateless publishable client без сессии
администратора. Все fetch — no-store, страницы force-dynamic; публиковать код
при изменении цены, категорий или товаров не требуется. Категории передаются
в существующий рекурсивный StoreHeader. UUID используется как ключ, slug — адрес.
Скрытие предка скрывает всю ветку. Неизвестная/скрытая категория возвращает 404
до начала streaming; для результатов предусмотрен Suspense loading.

`catalog_search` — SECURITY INVOKER, не обходит RLS. Общие условия пересекаются
в PostgreSQL, размер+цвет+stock проверяются в одной строке variant. Категория
включает дочерние узлы. Цена хранится и сравнивается в копейках. Итоги и facets
не раскрывают скрытые товары. Сортировки: published_at / цена ↑ / цена ↓,
стабильный tie-break UUID. 12 товаров на странице; SQL ограничивает page size до 48.

URL: q, category (slug), повторяемые size/color, min/max в гривнах, stock=1,
sort=newest/price-asc/price-desc, page, new=1, sale=1. GET-форма сбрасывает страницу
при новых условиях. Пагинация сохраняет фильтры. Ввод ограничивается по длине,
денежные значения разбираются без хранения float, сортировка по allowlist.

## Приватные фотографии

`/media/[id]` сначала читает product_images через RLS, затем Storage через тот же
publishable client. Отдаёт bytes с private/no-store/nosniff; скрытый или отсутствующий
файл — 404. Никаких service-role ключей и публичных Storage URL. Next Image используется
с unoptimized, чтобы оптимизатор/CDN не создал публичную копию приватного файла.
Изображения ленивые, 3:4; при отсутствии/ошибке есть текстовый placeholder.

## Изоляция Production и Preview

Vercel Production **не подключён к kos-jeans-dev**. Серверный адаптер отключён
при VERCEL_ENV=production. До отдельного согласования производственной БД каталог
там показывает сообщение об отсутствии подключения, принятая demo-главная остаётся.
На local/Preview при наличии env главная показывает публикации и меню из БД,
статические демотовары рабочего режима не используются.

Для Preview владелец добавляет в Vercel → kos-jeans → Settings → Environment Variables:

- NEXT_PUBLIC_SUPABASE_URL — из локального .env.local;
- NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY — Publishable key из того же файла.

Scope: **только Preview**, Git branch **feat/block-06-real-catalog**. Не выбирать
Production, не добавлять service-role/secret key. После сохранения нужен новый
Preview Deployment (push или Redeploy). Обычная Vercel Preview Authentication
сохраняется. Значения не отправлять в чат/PR и не включать в скриншоты.

## Проверочный ассортимент

`npm run catalog:seed -- --dev-only` создаёт строго в проекте с именем kos-jeans-dev
детерминированные UUID, категории с префиксом ТЕСТ, 13 опубликованных товаров,
draft/archived/hidden примеры и варианты для проверки сочетаний. Фото — лицензированные
иллюстрации straight/women/men из public/images/storefront, не настоящий ассортимент.
Описание и названия явно тестовые. В production этот сценарий запускать запрещено.

`npm run catalog:seed -- --dev-only --cleanup` удаляет только эти известные
фикстуры и их фото. Не предназначен для данных владельца; не заменяет миграции.
Служебный ключ для тестового setup получается CLI только в память процесса,
не используется в публичном приложении и не сохраняется в env/Git.

`npm run catalog:test:hosted -- --dev-only` проверяет реальный RPC и локальный HTTP
на 127.0.0.1:3005. Проверяет обновление цены/меню без сборки; восстанавливает собственные
временные изменения в finally, оставляет помеченный набор для просмотра.
Отчёт: [block06-hosted.json](checks/block06-hosted.json).

Локальные SQL/URL тесты входят в `npm test`, облачных ключей в CI нет.
Браузерные размеры и снимки: [responsive](previews/catalog/responsive.json),
[desktop](previews/catalog/desktop.jpg), [mobile](previews/catalog/mobile.jpg).

Технические источники: [Supabase functions/RLS](https://supabase.com/docs/guides/database/functions),
[Next fetch no-store](https://nextjs.org/docs/app/api-reference/functions/fetch).
UX — [наблюдения блока 03](REFERENCE_AND_UX.md); повторный web-доступ к Spazio дал 403.

Возможность ограничить Preview переменные конкретной Git-веткой описана в
[официальной документации Vercel](https://vercel.com/docs/environment-variables).


## Проверка опубликованного Preview

Новая сборка d96cd67 получила обновлённые env. В авторизованном Chrome проверены
13 публикаций, 12 загруженных фото, совместные фильтры, URL, сортировка/пагинация,
скрытая категория и пустой поиск. Временное изменение цены и новая категория
в kos-jeans-dev появились на Preview без деплоя, затем были восстановлены.
[Отчёт](checks/block06-preview.json). Стандартная Vercel Authentication сохраняется.
