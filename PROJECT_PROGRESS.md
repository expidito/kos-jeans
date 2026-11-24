# Прогресс KOS JEANS

Дата начала: **2026-11-23**. Последнее обновление: **2026-11-24** (Europe/Vienna).
Источник требований: [AGENTS.md](AGENTS.md).

Статусы: `todo` — не начат; `in_progress` — выполняется;
`done` — критерии приёмки пройдены; `blocked` — требуется внешнее действие.

| Блок | Название | Статус | Дата изменения | Результат / ссылки |
| --- | --- | --- | --- | --- |
| 00 | Проверка среды и GitHub-репозиторий | done | 2026-11-23 | [Публичный репозиторий](https://github.com/expidito/kos-jeans), `main`, origin и публикация проверены |
| 01 | Каркас приложения и инженерные стандарты | done | 2026-11-23 | [PR #1](https://github.com/expidito/kos-jeans/pull/1) слит в `main` с разрешения владельца; локальная main синхронизирована |
| 02 | Ранний preview на Vercel | done | 2026-11-23 | [Публичный сайт](https://kos-jeans.vercel.app), GitHub Integration и автоматический preview проверены |
| 03 | UX-анализ Spazio и дизайн-система | done | 2026-11-24 | [PR #3](https://github.com/expidito/kos-jeans/pull/3), UX-документ, токены, UI-примитивы и `/design-system` |
| 04 | Публичная оболочка и главная страница | done | 2026-11-24 | [PR #4](https://github.com/expidito/kos-jeans/pull/4), адаптивная главная, успешные проверки и Vercel Preview |
| 05 | Supabase: схема, миграции, RLS, Storage | blocked | 2026-11-24 | Миграции и клиенты подготовлены, локальные SQL/RLS тесты пройдены; требуются CLI-авторизация и hosted-проверки |
| 06 | Настоящий каталог и динамические категории | todo | 2026-11-23 | — |
| 07 | Страница товара и варианты | todo | 2026-11-23 | — |
| 08 | Защищённый вход администратора и каркас `/admin` | todo | 2026-11-23 | — |
| 09 | Админка: категории и подкатегории | todo | 2026-11-23 | — |
| 10 | Админка: товары, фото, цены, варианты и склад | todo | 2026-11-23 | — |
| 11 | Полноценная корзина | todo | 2026-11-23 | — |
| 12 | Оформление заказа и атомарные остатки | todo | 2026-11-23 | — |
| 13 | Админка: заказы и статусы | todo | 2026-11-23 | — |
| 14 | Баннеры, настройки, контентные страницы и SEO | todo | 2026-11-23 | — |
| 15 | Полное тестирование и защита | todo | 2026-11-23 | — |
| 16 | Итоговая публикация и подготовка к домену | todo | 2026-11-23 | — |

## Блок 00

- Исходно в папке находился только `AGENTS.md`, Git-репозитория не было.
- Исходный `AGENTS.md` сохранён без изменений.
- Git: 2.54.0; GitHub CLI: 2.103.3; аккаунт: `expidito`.
- Авторизация `gh` подтверждена вне сетевых ограничений sandbox.
- Созданы `README.md`, `.gitignore`, пустой шаблон `.env.example` и этот журнал.
- Создан публичный репозиторий [expidito/kos-jeans](https://github.com/expidito/kos-jeans),
  `origin` подключён к `https://github.com/expidito/kos-jeans.git`, ветка — `main`.
- Следующие блоки не начаты. Команды приложения и CI пока отсутствуют.

### Проверки и результат

- `gh repo view expidito/kos-jeans --json nameWithOwner,url,visibility,defaultBranchRef`:
  `PUBLIC`, ветка по умолчанию `main`.
- Начальный коммит: [`1fa355c`](https://github.com/expidito/kos-jeans/commit/1fa355c93914c19d922c5adf547e66c0bc1e2db8).
- `git push -u origin main`: успешно, настроено отслеживание `origin/main`.
- `git ls-remote origin refs/heads/main`: SHA совпал с локальным начальным коммитом.
- `git diff --cached --check` и `git diff --check`: ошибок нет.
- `git check-ignore`: локальные env, `.vercel`, зависимости и приватные данные
  игнорируются; `.env.example` доступен для коммита.
- Проверка Python: в Git только 5 ожидаемых файлов, распространённых шаблонов
  токенов и приватных ключей не найдено; значения `.env.example` пустые;
  в дорожной карте перечислены все 17 блоков.
- `git status --short --branch` после начального push: чистая `main`,
  синхронизированная с `origin/main`.
- Ограничений и необходимых действий владельца для блока 00 нет.
- Следующий блок: **01 — Каркас приложения и инженерные стандарты**. Не начат.

## Блок 01

- Выполнен после сообщения владельца «Работу над блоком окончено» для блока 00.
- Ветка реализации: `feat/block-01-app-scaffold`; 2026-11-23 владелец явно
  разрешил слияние PR #1 в `main`, слияние выполнено.
- В текущем корне создан Next.js App Router с React, TypeScript strict и
  Tailwind CSS через PostCSS. Зависимости закреплены в `package-lock.json`.
- Добавлены `dev`, `build`, `start`, `lint`, `typecheck`, alias `@/*`,
  ESLint flat config, `.nvmrc` (Node.js 24) и GitHub Actions CI.
- Главная `/` — украинская стартовая страница с явной пометкой разработки,
  без каталога, корзины, административных операций и заказов.
- Добавлены корневой layout `lang="uk"`, `noindex, nofollow`, ссылка пропуска
  к основному содержимому и украинская страница 404.
- Структура: `src/app/(store)`, `src/components`; запуск и CI описаны в README.
- `agentRules: false` предотвращает автоматическое изменение технического
  задания сервером Next.js. `AGENTS.md` сохранён побайтно.
- TypeScript 6.0.3 и ESLint 9.39.5 выбраны для совместимости плагинов без
  обхода peer dependency ограничений. npm сообщает об окончании поддержки
  ESLint 9; обновление до 10 нужно выполнить после совместимости плагинов.

### Проверки и результат

- `npm install`: успешно; аудит при установке — 0 уязвимостей.
- `npm run lint`: успешно, без предупреждений.
- `npm run typecheck`: успешно, включая генерацию типов маршрутов до сборки.
- `npm run build`: успешно; `/` и `/_not-found` статически сгенерированы.
- Dev-сервер запущен; главная возвращает HTTP 200, неизвестный маршрут — 404.
- `npm start`: production-сервер запускается; HTTP-проверка подтвердила
  украинский контент, пометку разработки, noindex, доступность собранного CSS
  с адаптивными правилами и настоящую украинскую страницу 404.
- `git diff --check`: успешно; `AGENTS.md` не изменён.
- В sandbox запуск сервера и первая сборка были ограничены локальными портами;
  после удаления сгенерированного кэша неуспешной сборки и запуска с
  разрешённым доступом проверки прошли. Это не требовало изменения приложения.
- GitHub Actions: чистая установка `npm ci`, затем lint/typecheck/build на
  Node.js 24 для push/PR. Актуальные запуски доступны во вкладке
  [Actions](https://github.com/expidito/kos-jeans/actions).
- CI коммита реализации `03eb0fd` завершился успешно:
  [запуск 45265451226](https://github.com/expidito/kos-jeans/actions/runs/45265451226).
- Ветка опубликована, создан [PR #1](https://github.com/expidito/kos-jeans/pull/1).
  PR слит в `main` с разрешения владельца, merge-коммит:
  [`b6f8589`](https://github.com/expidito/kos-jeans/commit/b6f85896620b92a72d802e8cf90957e6702ebbab).
  `git merge-base --is-ancestor 8256dd4 main` подтвердил наличие всех изменений;
  `git pull --ff-only origin main` синхронизировал локальную `main` с GitHub.
- Бизнес-тестов пока нет; фиктивная команда `npm test` не добавлялась.
- Supabase и Vercel не подключались. Блок 02 не начат.
- Следующий блок: **02 — Ранний preview на Vercel**.

## Блок 02 — done: ранняя публикация Vercel

- Ветка: `feat/block-02-vercel-preview`, создана от синхронизированной `main`
  (`b6f85896620b92a72d802e8cf90957e6702ebbab`). Блок 03 не начат.
- Владелец выполнил вход в Vercel и подключил GitHub. Создан проект `kos-jeans`
  в `Fedir Team`; в настройках Git подтверждено `expidito/kos-jeans`.
- Первичная форма импорта потребовала дополнительной проверки личности и
  вернулась с отменённой проверкой. Проект уже был создан, поэтому повторный
  импорт не выполнялся. Сборка успешно запущена через Create Deployment из `main`.
- Production: **https://kos-jeans.vercel.app**. Deployment `Ready`, исходный
  коммит `b6f8589`, окружение Production, ветка `main`:
  [Vercel deployment](https://vercel.com/fedir-team/kos-jeans/GHrwkuRanYYQzurr1uCjxmJBLo6L).
- GitHub Integration включена: production связан с `main`, feature-ветки дают
  Preview Deployments. Настройка подтверждена реальным push `5054ccf` без ручного
  запуска preview: Vercel автоматически собрал ветку `feat/block-02-vercel-preview`.
- Preview для `5054ccf`: [deployment](https://vercel.com/fedir-team/kos-jeans/5XPTzEAR4zFRdtVCykrBi18gqL2X),
  [адрес](https://kos-jeans-o8ujl62md-fedir-team.vercel.app).
  Статус Vercel в GitHub — `success / Deployment has completed`.
- Preview сохраняет стандартную защиту Vercel: анонимный запрос получает 302
  на вход. Production проверен без cookies и доступен публично.
- Добавлен `vercel.json`: Next.js, `npm ci`, `npm run build`.
  Конфигурация слита в `main` 2026-11-24 с явного разрешения владельца.
- Поле GitHub Website обновлено: https://kos-jeans.vercel.app.
- README и [инструкция Vercel](docs/VERCEL_SETUP.md) содержат реальные адреса,
  способ проверки изменений и порядок задания переменных окружения.
- Supabase не подключался. Платные услуги и пробные подписки не активировались.

### Проверки и результат

- Production HTTP-проверка через системный `curl` без cookies/авторизации:
  HTTPS с проверкой TLS, главная 200, `lang="uk"`, пометка разработки,
  `noindex, nofollow`, собранный CSS 200, неизвестный маршрут 404 с украинским текстом.
- Публичная страница также открыта и визуально проверена в Chrome.
- Системный curl использован потому, что у локального Python 3.15 отсутствует
  настроенное хранилище CA; проверка TLS не отключалась.
- Vercel: production `b6f8589` и автоматический preview `5054ccf` — `success`.
- CI preview-коммита прошёл: [запуск 45269255394](https://github.com/expidito/kos-jeans/actions/runs/45269255394),
  `npm ci`, lint, typecheck и build.
- CI main после слияния блока 01 также успешен:
  [запуск 45267882901](https://github.com/expidito/kos-jeans/actions/runs/45267882901).
- `git diff --check` и проверка локальных ссылок документации — успешно.
- Первая публикация production была запущена вручную из Git reference `main`;
  автоматический запуск подтверждён для feature-ветки и, после слияния PR #2, для `main`.
- Это стартовая тестовая страница, не готовый коммерческий магазин.
- Следующий блок: **03 — UX-анализ Spazio и дизайн-система**. Не начат.

### Подтверждение слияния блока 02 — 2026-11-24

- PR #2 слит с разрешения владельца. Merge-коммит `dfa91d69642c81a3ab36303a3e94e9c943dbbcde`.
- `git pull --ff-only origin main` выполнен, локальная `main` совпала с `origin/main`.
- Vercel автоматически опубликовал `dfa91d6`:
  [Production Deployment](https://vercel.com/fedir-team/kos-jeans/CJdmemxArsgyXqSYkDcv7bpCmaxC).
- В интерфейсе Vercel подтверждены Ready / Production / Current, Source `main`
  `dfa91d6` и домен `kos-jeans.vercel.app`. Статус Vercel в GitHub — success.
- Публичная ссылка повторно проверена системным curl: HTTPS 200, украинский
  контент из main и noindex. Production-триггер при merge теперь проверен фактически.

## Блок 03 — done: UX-анализ и дизайн-система

- Ветка `feat/block-03-ux-design-system` создана от синхронизированного `main` `dfa91d6`.
- Изучены главная, женский раздел, категория джинсов и карточка товара Spazio;
  мобильное вложенное меню, фильтр, сортировка и адаптивная сетка проверены в Chrome.
- Наблюдения и ограничения записаны в [REFERENCE_AND_UX.md](docs/REFERENCE_AND_UX.md).
- Собственная концепция, сетка, токены, состояния и контракты компонентов —
  [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md).
- Созданы `/design-system`, `src/styles/tokens.css`, UI-примитивы в `src/components/ui`.
  Manrope поставляется локально с кириллицей через пакет с лицензией OFL-1.1.
- Образцы используют только специально созданные векторные иллюстрации,
  демонстрационные названия и цены. Ассеты и оформление Spazio не скопированы.
- Главная магазина, реальный каталог и динамическое меню не реализовывались:
  это задачи следующих блоков. В библиотеке нет зашитого дерева категорий.
- Блок 04 не начат.

### Проверки блока 03

- `npm run lint`, `npm run typecheck`, `npm run build`: успешно.
- Production HTTP: `/design-system` и `/` — 200, неизвестный путь — 404;
  украинский язык и noindex сохранены. CSS и все 6 локальных файлов шрифтов — 200.
- Chrome: 320/390/768/1440 px, ширина содержимого равна viewport, переполнения
  нет; один h1, Manrope загружен, основные кнопки имеют высоту 48 px.
- Проверены действия кнопок, ввод текста и сброс; ArrowRight с 28 выбирает 30,
  пропуская disabled 29; Enter открывает details. У поля ошибки есть
  aria-invalid и ссылка aria-describedby на сообщение.
- Вычислен контраст семантических пар: текст не ниже 5.24:1 в проверенных
  комбинациях; граница input на белом 3.44:1, пороги 4.5:1 и 3:1 пройдены.
- Проверено форматирование целых копеек: UAH, дробная часть, ноль; отрицательные,
  нецелые, нечисловые и небезопасные целые значения отвергаются.
- В локальной production-странице нет ошибок консоли. В dev Chrome найдено
  предупреждение о внедрённых расширением атрибутах data-lt-installed;
  приложение эти атрибуты не создаёт, подавление React-проверок не добавлялось.
- `git diff --check`, локальные ссылки документов — успешно; `AGENTS.md` не изменён.
- Собственные screenshots сохранены: [desktop](docs/previews/design-system-desktop.jpg),
  [mobile](docs/previews/design-system-mobile.jpg).
- Реализация: `0b1ca03`, опубликована отдельная ветка; [PR #3](https://github.com/expidito/kos-jeans/pull/3)
  открыт, не слит в `main`.
- CI реализации успешен: [запуск 45400323357](https://github.com/expidito/kos-jeans/actions/runs/45400323357).
- Vercel Preview — Ready: [deployment](https://vercel.com/fedir-team/kos-jeans/83pa2NjQeNY8hGYiasN7HzVMbzkU).
  [Живая дизайн-система](https://kos-jeans-git-feat-block-03-ux-design-system-fedir-team.vercel.app/design-system)
  использует стандартную авторизацию Vercel Preview. Защита не отключалась.


### Слияние блока 03 — 2026-11-24

- PR #3 слит с явного разрешения владельца; merge `9e86453b26025fef2b54dba978f8af3a22036783`.
- Локальная `main` синхронизирована fast-forward с `origin/main`, оба SHA совпали.
- Автоматический Production Deployment успешен:
  [Vercel](https://vercel.com/fedir-team/kos-jeans/D6nbHceYLSvmhYYmzp9rG89dACTZ).
- Публичный `/design-system` на https://kos-jeans.vercel.app проверен: HTTPS 200,
  актуальный контент слитого main, украинский язык и noindex.

## Блок 04 — публичная оболочка и главная

- Ветка `feat/block-04-storefront-home` создана от синхронизированной `main` `9e86453`.
- Использованы токены, Manrope, Price, Badge и TextField из блока 03.
- Созданы шапка с desktop mega-menu, рекурсивное мобильное меню, поиск по
  демозразцам и пояснение недоступной корзины. Native dialog дополнен циклом
  фокуса; Escape, блокировка прокрутки и возврат фокуса проверяются отдельно.
- Меню получает дерево и иллюстрации через props. Демоисточник находится в
  `src/data/demo-storefront.ts`, а не внутри компонентов навигации.
- Главная содержит hero/CTA, женскую и мужскую подборки, категории, новинки,
  популярное, denim-акцент, распродажу, информацию о бренде и footer.
- Девять фотографий — бесплатные Unsplash Free Photo. Источники и лицензия:
  [IMAGE_SOURCES.md](docs/IMAGE_SOURCES.md) и `src/data/storefront-photo-credits.json`.
- Общая маркировка demo, бейджи образцов и пояснения секций/окон не дают принять
  иллюстрации, цены и подборки за реальный ассортимент или рейтинг продаж.
- Исправлена фактически найденная ошибка гидратации: ICU браузера обозначал
  гривну как «грн», сервер — «₴». Форматирование целых копеек теперь детерминировано;
  добавлены регрессионные проверки `npm test` и запуск тестов в CI.
- Нет Supabase, настоящего каталога, корзины, заказа, платежей или сборщиков
  контактов. Блок 05 не начат.

### Проверки блока 04

- `npm run lint`, `npm run typecheck`, `npm test` (2 теста), `npm run build` — успешно.
- Production-сборка локально: `/` и `/design-system` — 200, неизвестный путь — 404.
- Проверены 320, 390, 768 и 1440 px: scrollWidth равен ширине viewport,
  один h1, якоря существуют, горизонтальной прокрутки нет.
- 19 изображений на странице загрузились; все 9 исходников через Next Image — HTTP 200.
- Клавиатура: ArrowDown/Escape в desktop-меню, Tab/Shift+Tab внутри dialog,
  возврат фокуса; вложенное мобильное меню, закрытие и блокировка фона — успешно.
- Поиск проверен для результата и пустого состояния, карточки — только просмотр;
  неподключённая корзина объясняет ограничение. Ошибок консоли production нет.
- HTML содержит украинский lang, цены ₴, Open Graph и noindex/nofollow.
- `git diff --check` и локальные ссылки документации — успешно.
- Проверки выполнены во встроенном браузере Codex: Chrome-инструмент недоступен.
- Свои снимки: [desktop](docs/previews/storefront/desktop.jpg),
  [mobile](docs/previews/storefront/mobile.jpg),
  [mobile menu](docs/previews/storefront/mobile-menu.jpg).
  Размеры: [responsive-checks.json](docs/previews/storefront/responsive-checks.json).
- Архитектура и границы: [STOREFRONT_HOME.md](docs/STOREFRONT_HOME.md).

### Публикация блока 04

- Реализация: `17ffb35`, feature-ветка опубликована; [PR #4](https://github.com/expidito/kos-jeans/pull/4)
  открыт в main, не слит. Merge требует отдельного разрешения владельца.
- CI реализации прошёл: [запуск 45406176781](https://github.com/expidito/kos-jeans/actions/runs/45406176781).
- Vercel Preview — Ready / success:
  [deployment](https://vercel.com/fedir-team/kos-jeans/3KR3vLJ3F5mJdCrezJV5SpzxVKSR).
- [Главная Preview](https://kos-jeans-git-feat-block-04-storefront-home-fedir-team.vercel.app)
  защищена стандартным входом Vercel: без авторизации HTTP 302 на Vercel SSO,
  x-robots-tag: noindex. Защита не отключалась; публичный production остаётся на блоке 03.
- Блок 04: `done`. Блок 05: `todo`, не начат.

### Слияние блока 04 — 2026-11-24

- Владелец принял внешний вид и разрешил merge. Проверки PR #4 повторно
  подтверждены: все SUCCESS; head `83da1a1`.
- PR #4 слит: merge `908d7f0`. Локальная main обновлена fast-forward до origin/main.
- Production Deployment автоматически прошёл:
  [Vercel](https://vercel.com/fedir-team/kos-jeans/DzzVzUACLsh6p3Uo4wqXEF94zd9b).
- https://kos-jeans.vercel.app вернул HTTP 200; проверены актуальные hero,
  «Новинки», украинский lang и noindex из main блока 04.

## Блок 05 — blocked: Supabase foundation

- Ветка `feat/block-05-supabase-foundation` создана от main `908d7f0`.
- Две SQL-миграции: 9 публичных таблиц, private.admin_users, FK/индексы/unique/check,
  вложенные категории и защита циклов, деньги в копейках, снимки заказов.
- RLS: публичен только опубликованный каталог с видимыми предками, роль проверяется
  через закрытую таблицу; нет клиентской записи заказов и публичного чтения заказов.
- Приватный store-media: admin-only запись, чтение только связанных публичных фото,
  пути по UUID, JPEG/PNG/WebP и лимит 5 МиБ. Storage API ещё не проверен.
- Owner-only примитив атомарного списания проверен на успех/отказ/полный rollback;
  API для заказа не открыт. Полный checkout и конкурентные сессии — будущий блок 12.
- Официальные SSR-клиенты с publishable key/RLS, server-only и request cookies;
  refreshSession подготовлен для будущего Auth proxy, пока не подключён.
- `.env.example`, CLI config, безопасный draft seed, read-only `npm run db:check`,
  [инструкция владельцу](docs/SUPABASE_SETUP.md). Главная/дизайн-система не изменены.

### Проверки блока 05

- `npm test`: 17/17 успешно, включая 14 PostgreSQL/RLS/Storage SQL тестов
  на отдельной in-memory PGlite, а не на внешнем Supabase.
- `npm run lint`, `npm run typecheck` — успешно. Удалены только дубли generated
  типов `.next/types/* 2.ts`, мешавшие первому typecheck.
- `NEXT_TELEMETRY_DISABLED=1 npm run build -- --webpack` — успешно.
- Локальный `npm run build` (Turbopack) ограничен средой: EPERM при открытии
  служебного порта PostCSS. Даже вне sandbox ошибка повторяется; стандартная
  сборка будет проверена CI. Код приложения ради этого не менялся.
- Production-сборка Webpack локально: `/` и `/design-system` — HTTP 200,
  неизвестный маршрут — 404; украинский lang и noindex сохранены.
- `git diff --check` — успешно; src/app, components, styles и demo-data не изменены.
- `npm run db:check` — ожидаемый отказ: отсутствуют `.env.local` и Supabase env.
- CLI `whoami` — AccessTokenRequiredError. Supabase connector, Docker, psql
  отсутствуют. Внешний проект/миграции/Storage не создавались и не применялись.

### Публикация подготовленной основы блока 05

- Коммит `f1c1b2a` опубликован в `feat/block-05-supabase-foundation`.
- [Draft PR #5](https://github.com/expidito/kos-jeans/pull/5) открыт, не слит;
  draft отражает незавершённые внешние критерии приёмки.
- [CI 45409186425](https://github.com/expidito/kos-jeans/actions/runs/45409186425)
  успешно выполнил lint/test/typecheck и стандартный Turbopack build.
- Vercel — Ready / success:
  [deployment](https://vercel.com/fedir-team/kos-jeans/GZAUDzjzGbugCY2iZuZVJkRxjWDn),
  [preview](https://kos-jeans-git-feat-block-05-supabase-foundation-fedir-team.vercel.app)
  со стандартной защитой Vercel. Это публикация приложения, не доказательство
  подключённого Supabase. Supabase env в Vercel не добавлялись.

### Что требуется для завершения блока 05

- Dev-проект и `.env.local` подготовлены и проверены. Владельцу осталось
  завершить `npx --yes supabase@3.3.0 login` в своём терминале.
- Затем применить миграции только к dev, проверить API/RLS под обычным и admin JWT,
  настоящие upload/read/delete и отказы MIME/размера/пути Storage API.
- Пока эти критерии не пройдены, статус **blocked**, а не done.
- Блок 06 не начат.

### Продолжение блока 05 — проверка доступа

- Владелец сообщил о создании бесплатного `kos-jeans-dev` и разрешил миграции
  только к тестовому проекту. Production не затрагивается.
- Фактически найден `.env.local.rtf` вместо plain-text `.env.local`.
  Выполнена локальная RTF → TXT конвертация в `.env.local` с правами 0600;
  оригинал сохранён. Оба файла игнорируются Git.
- Наличие NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY и
  формат HTTPS URL / publishable key подтверждены без вывода значений.
- Реальный Auth API отвечает HTTP 200. Чтение categories — HTTP 404 / PGRST205:
  таблицы ещё отсутствуют в API schema cache, миграции не применены.
- CLI `whoami` по-прежнему возвращает AccessTokenRequiredError. Publishable key
  не предоставляет право DDL; попыток обхода полномочий не выполнялось.
- Владелец должен выполнить в терминале проекта `npx --yes supabase@3.3.0 login`,
  самостоятельно завершить вход и сообщить об авторизации. Пароль БД не запрашивается в чате.
- Текущий блок остаётся **blocked** до CLI-авторизации и hosted-проверок.

После отчёта остановиться. Переход к следующему блоку — только после
сообщения владельца **«Работу над блоком окончено»**.
