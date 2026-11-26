# Приёмка блока16: безопасная публикация и план запуска

2026-11-26. Статус: техническая часть проверена, PR/финальный Preview ожидают приёмки.
Реальные заказы, индексация, новый prod-проект, домен, DNS и платные услуги не включались.

## Production и Git

PR15 повторно проверен зелёным и слит с разрешения владельца.
main/origin/main синхронизированы: e71f98a802648a8983e40e6a3ed744c8b16f64ff.
Vercel Project Overview подтвердил Current Production/Ready, branch main, тот же SHA:
[deployment](https://vercel.com/fedir-team/kos-jeans/5BrRKKCHQ2vUN4zt5zkCgpJmQGG6).
[Действующий сайт](https://kos-jeans.vercel.app), GitHub Website указывает на него.
Ветка16: feat/block-16-launch-preparation. Её merge/Production ещё не разрешены.

[GET-smoke](checks/launch/production-smoke.json): главная, каталог, cart/checkout,
контакты/delivery/returns/privacy/terms/login200; отсутствующие URL, dev-категория,
dev-товар, чужой receipt/media404; admin redirect; GET checkout session503 как
ожидаемый disabled state. HTTPS сертификат валиден, HTTP→HTTPS, robots закрыт,
sitemap без test URL, canonical/OG/description корректны. Сканированы публичные
JS chunks и HTML — текущих dev URL/key/server secret и secret-pattern не найдено.
Проверки не отправляли POST и не подключались к production-БД.

## Окружения

- [Vercel metadata](checks/launch/vercel-environments.json): три Supabase env только Preview,
  без branch labels; значения не открывались. Production Branch main, deployment Ready.
- [Local](checks/launch/local-environment.json): необходимые dev env присутствуют,
  .env.local игнорируется Git, CLI target/link kos-jeans-dev. Ключи не печатались.
- [Auth Dashboard](checks/launch/auth-configuration.json): dev Site URL localhost,
  allowlist пуст; current password login использует серверный same-origin /admin.
  Email recovery/OAuth routes не реализованы. Настройки не менялись.
- publicCatalogClient/adminConfigured/checkoutAvailable запрещают Production кодом;
  indexingEnabled всегда false. Случайное добавление env не снимает эти запреты.
- Будущая kos-jeans-prod не создавалась/не видна среди проектов владельца;
  её подключения/администратора/backup нельзя считать проверенными.
- Dev ledger6 при9 исходных миграциях; последние3 применены SQL в предыдущих блоках.
  История не repair и SQL не повторяется; порядок новой чистой базы документирован.
- Dashboard dev показывал предупреждение высокого CPU. Compute/тариф не менялись;
  текущий Production от этого проекта изолирован.

## Пустые состояния и изменение в ветке16

В существующем main главная всё ещё содержит явно маркированные статические
демоподборки раннего макета, не данные dev. Catalog при этом пуст и checkout закрыт.
Для устранения демонстрационных цен из отключённого Production подготовлено точечное
изменение: главная использует существующую live-оболочку с пустой коллекцией вместо
demo adapter. Hero/типографика/лицензированные фото сохраняются. Preview с dev не меняется.

Изменение **не опубликовано в Production без разрешения merge16**.
[Локальный Production mirror](checks/launch/local-production-mirror.json),
[регрессия собранного приложения](checks/launch/local-production-smoke.json),
[пять ширин](checks/launch/prepared-home-responsive.json),
[подготовленная главная](checks/launch/prepared-production-home.jpg).
Black-box регрессия включена в CI после обычного build: собственный loopback сервер,
пустые ключи, Production mode, только GET, остановка сервера после теста.

## Адаптивность и страницы

Production e71f98a:65 измерений —13 страниц ×320/390/768/1024/1440;
scrollWidth=innerWidth, broken images0. Проверены mobile nested menu/Escape,
footer, пустой каталог, info drafts, disabled checkout/login и реальные404.
[DOM](checks/launch/production-responsive.json),
[публичный пустой каталог](checks/launch/production-catalog-mobile.jpg).
Незаполненные инфостраницы остаются явно помеченными черновиками, без вымышленных условий.
Новая пустая главная также проверена на пяти фактических ширинах, без overflow.

## Документы и ссылки

- [DOMAIN_SETUP](DOMAIN_SETUP.md): регистратор/Vercel, значения DNS только из Dashboard,
  www/HTTPS/redirect/canonical/Auth/SEO и порядок проверки, без покупки/изменения DNS.
- [LAUNCH_CHECKLIST](LAUNCH_CHECKLIST.md): готово / действия владельца / запреты.
- [SUPABASE_PRODUCTION](SUPABASE_PRODUCTION.md): новая чистая база,9 миграций,
  RLS/private Storage, подтверждённый UUID admin, Auth/env, backup PostgreSQL+файлов и restore.
- [OWNER_GUIDE](OWNER_GUIDE.md): вход, категории, товары/фото/stock, заказы, баннеры/контент.
- README, Supabase/Vercel setup и Auth обновлены;45 локальных markdown ссылок проверены.
  [Сервисные ссылки](checks/launch/service-links.json) доступны или требуют обычного входа владельца.

## Проверки и ограничения

- Локальные lint/typecheck/79 тестов проходят.
- Обычный `npm run build` локально попытался открыть служебный порт Turbopack/PostCSS
  и получил OS error1. Это ограничение рабочей среды; ошибка сохранена в отчёте,
  проверки не отключены. `npm run build -- --webpack` проходит, включая отдельную
  сборку с Production mode/пустыми env. CI/Vercel выполняют обычный build.
- Black-box Production-mode smoke проходит; remote Production read-only smoke проходит.
- GitHub Actions/Ready Preview финального PR подтверждаются перед завершением блока.

Перед реальной торговлей нужны данные продавца/контакты/юридические условия, подходящий
тариф, согласованное создание prod-базы/администратора/env, резервирование и restore-тест,
реальный ассортимент и отдельная приёмка. Vercel Hobby ограничен некоммерческим использованием:
[официальные условия](https://vercel.com/docs/plans/hobby). Бесплатный Supabase не даёт
права обещать включённые paid backups/PITR; [возможности](https://supabase.com/docs/guides/platform/backups).
Домен/коммерческая работа/индексация — только после отдельных решений владельца.
