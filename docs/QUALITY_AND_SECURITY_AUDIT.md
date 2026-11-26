# Аудит качества и безопасности KOS JEANS — блок 15

**Статус: done, 2026-11-26.** Приёмка в local/настоящем Vercel Preview с kos-jeans-dev.
Это завершённый аудит текущего этапа, а не разрешение коммерческого запуска.
Блок 16 не начат. PR #15 не сливается без отдельного подтверждения владельца.

- PR #14 слит с разрешения владельца после зелёных проверок; main/origin/main: 2119745.
- Ветка: feat/block-15-quality-security; [PR #15](https://github.com/expidito/kos-jeans/pull/15).
- [Preview каталога](https://kos-jeans-git-feat-block-15-quality-security-fedir-team.vercel.app/catalog),
  [админка](https://kos-jeans-git-feat-block-15-quality-security-fedir-team.vercel.app/admin/login).
- Production env/база не менялись, dev к Production не подключён, noindex сохранён.

## Исправленные дефекты

| Приоритет | Проблема | Исправление и доказательство |
| --- | --- | --- |
| High | Next image optimizer выдавал приватный media URL с public max-age14400 | localPatterns разрешает только статические storefront assets; приватные product/category/banner/admin URL дают400. На реальном Preview также показан400 INVALID_IMAGE_OPTIMIZE_REQUEST. [До](checks/quality/private-optimizer-before.json), [после](checks/quality/http-after.json) |
| High | Отклонённые checkout попытки расходовали глобальную квоту; новые session identifiers раздували таблицу | IP → session → global; 230 повторов и60 новых sessions в регрессии; отклонения не расходуют общий лимит, новые session rows ограничены IP |
| Medium | Нет ограниченного ожидания каталога/Auth | Общий fetch deadline12s на отдельную операцию, сохранение caller cancellation, no-store; checkout сохраняет собственный deadline20s; UI retry/error state |
| Medium | Некоторые admin catch показывали неизвестный Error.message | Только специально созданные FormError передаются в UI; остальные сообщения общие, logout обрабатывает недоступность Auth |
| Medium | Deferred sum guard проверял только новый order_id при переносе строки | Проверка старого и нового заказа; SQL-тест некорректного переноса откатывается |
| Medium | Исходные фото загружались для маленьких карточек | Уменьшение160/480/960/1440 после RLS metadata и Storage download; private/no-store, без Next optimizer. Корзина/checkout также480 |
| Medium | Одного MIME/magic недостаточно для проверки загружаемого фото | Sharp декодирует реальные пиксели, отклоняет повреждения/>32MP, ограничивает ширину2400, WebP без EXIF; тест ложного JPEG и ориентации |
| Low | Favicon404, отсутствующие общие защитные headers | Собственная SVG и nosniff, DENY iframe, Referrer-Policy |
| Low | Streaming metadata давала нестабильный результат SEO head-аудита | Metadata помещается в первоначальный head для всех consumers; canonical/description/OG сохранены |
| Low | Архивные товары заполняли низкие остатки Dashboard; текст обещал уже готовый контент в будущем | Согласованный inner join/filter исключает архив и из списка, и из счётчика; текст исправлен. Проверено в новом Preview |

Миграция `20261126000100_quality_hardening.sql` применена только к подтверждённому
kos-jeans-dev. Существующие товары и исходные изображения не переписывались.
Промежуточный общий loading создал регрессию404→200 из-за streaming; hosted-тест
её обнаружил. Loading удалён до публикации, missing product и чужой receipt снова404.
Проверки не отключались ради успешного результата.

## Проверки и CI

- Локально: `npm run lint`, `npm run typecheck`, `npm test` — **79pass**, production
  build с Webpack проходит. CI выполняет обычный `npm run build` и также проходит.
- Для проверенного кода43063fc: [push CI](https://github.com/expidito/kos-jeans/actions/runs/45731795932),
  [PR CI](https://github.com/expidito/kos-jeans/actions/runs/45731802208),
  [Vercel Ready](https://vercel.com/fedir-team/kos-jeans/5TZMPnyDC41ZUxnnCs7rdVCU3uNm).
  Документационный финальный push запускает эти же проверки заново; статус виден в PR.
- [Checkout hosted](checks/quality/block12-hosted.json): один заказ при повторе;
  приватный receipt; смена цены до списания требует подтверждения; два конкурентных
  заказа на последнюю единицу — один победитель; rollback после частичного списания;
  недоступные/архивные варианты и HTTP429/Retry-After.
- [Orders hosted](checks/quality/block13-hosted.json): конкурентные отмены возвращают
  stock один раз, конфликт разных статусов отклоняет stale writer; история не меняется
  от новых цен, реальная фильтрация по номеру/дате/статусу.
- [Products](checks/quality/block10-hosted.json), [категории](checks/quality/block09-hosted.json),
  [cart](checks/quality/block11-hosted.json), [content](checks/quality/block14-hosted.json)
  повторно выполнены в этом блоке; результаты исходных проверок не выдаются за новые.

## Сквозной UI-сценарий на настоящем Preview

Владелец вошёл своей постоянной учётной записью. Пароль не запрашивался и не читался.
Все операции ниже выполнены через интерфейс на одном коде до финальных небольших исправлений;
обновления базы не сопровождались commit/push/deploy.

1. Создана отдельная «ТЕСТ · Джинсові куртки · аудит15» внутри «ТЕСТ · Жінкам»;
   фото, описание, slug, вложенность, публичная категория. Новый раздел доступен без deploy.
2. Создана «ТЕСТ · Куртка Denim Blue · аудит15», SKU TEST-BLOCK15-DENIM-BLUE;
   пять разрешённых фотоиллюстраций из существующих лицензионных assets. Цена1499₴,
   синие S4/M3/L5 и графитовый S2. Черновая прямая страница404.
3. Публикация: товар в своей категории,1499₴, фото. Одновременно применены поиск,
   категория, S, синий, цена1000–1600, наличие и сортировка; один правильный результат,
   параметры отражены в URL.
4. В корзину добавлены графитовый S×1 и синий L×2. Цена в админке1299₴, старая1499₴,
   M0; после recheck/reload корзина3897₴, M недоступен в синем, выбор цвета меняет размеры.
   Нулевой остаток выбранного варианта блокирует checkout; затем свой stock восстановлен.
5. В редакторе заменены фото, изменены обложка/порядок, удаление подтверждено отдельным
   действием, конечное число фото5; все пять и основное фото загрузились на публичной странице.
6. На мобильном390 заполнены вымышленные контакты. Имя с цифрами отклонено понятным
   сообщением; после исправления заказ №28 на3897₴ создан ровно один раз.
   Повторное открытие/reload receipt сохраняет номер.
7. Admin показывает этот заказ и снимки двух вариантов; статус new→processing→cancelled.
   Повторная отмена из второй устаревшей вкладки сообщает, что возврат уже выполнен.
   [Создание](checks/quality/ui-order-created.json): графит S2→1, синий L5→3.
   [Две отмены](checks/quality/ui-order-cancelled.json): S2/L5/M0/синий S4, без двойного возврата.
8. Скрытие собственной категории делает товар404. После восстановления видимости
   проверены цвета/размеры. Две вкладки товара: сохранён победитель; устаревшая запись
   не перезаписала его, UI показал общее сообщение повторной попытки. Причина транспортного
   сообщения отдельно не устанавливалась; точный конфликт409/SQL40001 проверяется тестами.
9. Новый тестовый баннер: загрузка, публикация, изменение заголовка на главной без deploy,
   затем подтверждённая архивация. Тестовые контакты появились в footer.
   About со строкой `<script>…</script>` отобразился обычным текстом, исполняемые script
   не добавились. Исходные значения и отсутствие ранее несуществовавших записей восстановлены.
10. Dashboard обновлён с сохранённой сессией и повторно проверен на новом коде43063fc.
    Выход закрывает старую вкладку после reload и прямой адрес заказа; неверные
    вымышленные credentials дают общее сообщение, без приватных данных.

[UI acceptance](checks/quality/ui-acceptance.json), [auth](checks/quality/ui-auth-final.json),
[финальная публичная страница](checks/quality/preview-final.json).

## Безопасность

- RLS: anon/обычный authenticated не могут менять цену/размер/stock, выполнять admin RPC,
  загружать/удалять фото, читать черновики, архив и чужие orders/items.
  `user_metadata.role=admin` не даёт роли; UUID/роль в браузере не являются полномочием.
- Сервер требует проверенную Supabase identity и live private.admin_users. Прямые routes,
  API и Server Actions проверяют авторизацию независимо от меню.
- Mutations требуют правильный Origin; cross-origin POST отклоняется. Серверная валидация
  ограничивает ID, деньги, размеры, количество, JSON/body/files и URL схемы.
- Cookies HttpOnly/SameSite=Lax, Secure на Vercel. Приватные ответы no-store; общий кеш
  не используется для Auth/заказов/фото. Серверный secret отсутствует в browser artifacts.
- Данные заказа передаются в body, не в URL; receipt содержит номер/сумму, без контактов.
  Фиктивные customer данные явно TEST; реальные сведения не логируются в проверках.
- Механизм price/stock проверяет реальные данные, не доверяет localStorage. Добавление
  в корзину не резервирует/не списывает stock. Заказ и отмена атомарны и идемпотентны.
- SQL ввод проходит параметризованные RPC и ограничения БД; нежелательные HTML/URL
  экранируются или отклоняются. Изменение пользовательских метаданных не заменяет роль.

## Секреты, история, сохранность данных

[Scan](checks/quality/history-and-dependencies.json): **586 reachable blobs всех refs**,
~16.8MB на43063fc; secret/token/private-key/service-role-JWT/.env.local совпадений нет.
Email-кандидаты — стандартный комментарий Supabase config и тот же пример в самом сканере.
История не переписывалась, ключи не менялись. `npm audit`:0 известных уязвимостей.
Текстовые pattern-проверки не являются forensic OCR всех исторических изображений.
Административные screenshots обрезаны по main без email сессии; заказ на них вымышленный.
[Browser scan](checks/quality/client-secrets.json):73 файла, ~1.1MB несжатых сборочных
JS/JSON, без текущего server secret, secret-pattern и service-role JWT.

[Восстановление](checks/quality/ui-restored.json): отпечатки **существующих products,
variants и product_images совпадают с исходными**, записи настроек восстановлены по
значению/видимости и наличию, единственный собственный заказ отменён с возвратом один раз.
Собственные товар/категория/баннер архивированы, пять фото сохранены приватными;
анонимное чтение metadata и Storage download отклоняется. Аккаунт администратора сохранён.
История тестовых заказов не удаляется. Production данные не затронуты.

## Производительность

Lighthouse13.6.0, отдельный headless Chrome profile, mobile defaults, local production
build, анонимный kos-jeans-dev. Один прогон до/после, исходные JSON в checks/quality.
Это лабораторные замеры, не полевые метрики Vercel и не обещание SLA.

| Страница | Performance до→после | Accessibility | Best practices | LCP после | Transfer до→после |
| --- | --- | --- | --- | --- | --- |
| Главная |96→96|100|100|2.7s|2291→836KiB|
| Каталог |80→97|100|100|2.6s|2835→629KiB|
| Товар |84→94|100|100|3.2s|2568→470KiB|

TBT10ms, CLS0–0.001. SEO69: единственное падение — намеренный noindex.
49–53KiB framework JS Lighthouse считает неиспользуемыми; библиотека не переписывалась
ради лабораторного балла. React cache категорий действует только в одном request,
не сохраняет устаревшие цены. Metadata/canonical/OG проверены; robots закрыт, sitemap
не содержит тестовых URLs, Product structured data отключены для тестового магазина.

[Scale](checks/quality/scale.json):1000 товаров/вариантов и1000 заказов в rollback-транзакции,
без изменения sequence. Authenticated admin page20/stock sort~1087ms; order page20~6ms;
anon category/size/color/price/stock page20~1538ms, найдено1000. Это SQL время без сети.

## Адаптивность, доступность, ошибки

Проверены фактические320/390/768/1024/1440: главная, каталог, товар, корзина, checkout,
login, Dashboard, карточка заказа, редакторы товара/категории/баннера и настройки.
scrollWidth=innerWidth; несовпавшие первоначальные viewport override не засчитывались
и проверены заново в отдельной вкладке. [Public](checks/quality/preview-responsive.json),
[admin](checks/quality/admin-responsive.json), [login](checks/quality/preview-login-responsive.json).

Ручные проверки: nested mobile menu и возврат фокуса по Escape, gallery/zoom,
радиокнопки и недоступный M, клавиатурный переход между полями с видимым outline,
подписи полей, status/alert, admin mobile details keyboard, подтверждение удаления
фото и архивации. Lighthouse public A100; это не формальная WCAG сертификация.
[Dashboard](checks/quality/admin-dashboard.jpg), [товар mobile](checks/quality/admin-product-mobile.jpg),
[заказ mobile](checks/quality/admin-order-mobile.jpg), [checkout mobile](checks/quality/checkout-mobile.jpg).

Негативные сценарии:404/архив/hidden, empty catalog, отсутствие фото/fallback, malformed
input, цена/stock, retry/idempotency, invalid credentials/logout, разные admin writes,
таймаут/abort с контролируемым transport и Auth role-revocation/expiry mocks.
Реальный облачный Supabase не отключался, часовой срок сессии вручную не выжидался;
системный offline/throttling в браузере не включался. Эти проверки обеспечиваются
контролируемыми тестами и ограниченными error states, не объявляются ручными outage-тестами.

## Остаточные риски и блокеры коммерческого запуска

| Приоритет | Ограничение | Что требуется |
| --- | --- | --- |
| High, launch blocker | Нет подтверждённых реквизитов/контактов и согласованных delivery/payment/returns/privacy/terms | Владелец предоставляет и согласует реальные данные; шаблоны не являются юридическими обещаниями |
| High, launch blocker | Production намеренно изолирован от тестовой БД, нет согласованного production ассортимента/конфигурации | Отдельная согласованная публикация; не подключать kos-jeans-dev к Production |
| Medium | Рекурсивная RLS/facets заметно дорожает с ростом каталога; тысяча не равна десяткам тысяч | Перед большим ассортиментом EXPLAIN/load profiling и оптимизация без обхода RLS |
| Medium | Нет полевого мониторинга, SLA и проверки реального провайдерского outage | Дополнительное наблюдение после разрешённого запуска; timeout действует на отдельную операцию |
| Low | Прежние Preview содержат предыдущий код, доступ к Preview защищён Vercel SSO | Для приёмки использовать текущую ветку; отдельно согласовать вывод старых deployments из обращения, автоматически не удалять |
| Low | Остаточные приватные orphan media сохраняются/очищаются по существующим правилам, нет общей фоновой GC | Наблюдать Storage; не выполнять массовое удаление без разрешения |

В текущей проверенной ветке не осталось известных Critical/High технических дефектов.
Коммерческий запуск **не разрешён** по указанным High блокерам. Noindex и безопасная
изоляция сохраняются. Дальнейшая работа — только после подтверждения владельца.
