# Блок 08 — защищённая административная оболочка

## Доступ и границы

`/admin/login` — вход по email/паролю Supabase Auth, без публичной регистрации.
`/admin` — Dashboard: точные количества всех/опубликованных товаров, категорий,
заказов; до 8 активных вариантов с остатком 0–3 и общее число таких вариантов.
Отсутствующие данные обозначаются «—» / сообщением, ошибки не превращаются в ноль.
Персональные поля заказов не запрашиваются.

Маршруты `/admin/products`, `/admin/products/new`, `/admin/categories`,
`/admin/orders`, `/admin/banners`, `/admin/settings` защищены; сейчас это честные
страницы будущих блоков, без форм изменения данных. Desktop sidebar, мобильное
раскрывающееся меню, активный пункт, email сессии и выход. Украинский интерфейс,
Manrope и токены блока 03. Дизайн публичного магазина не меняется.

## Граница безопасности

- Request-scoped `@supabase/ssr` с publishable key; никаких service-role ключей в
  приложении, браузере и переменных Vercel.
- Auth cookies HttpOnly, SameSite=Lax, Secure на Vercel, ограничены своим host.
  Вход выполняется сервером; браузерный Auth client не используется админкой.
- Proxy обновляет сессию только на `/admin/:path*`. Сам по себе Proxy не является
  проверкой роли. `requireAdmin` независимо вызывается защищённым layout,
  страницами будущих разделов и операцией загрузки Dashboard.
- `auth.getUser()` сверяет личность с Auth сервером при каждом запросе;
  `is_store_admin()` читает существующую `private.admin_users` с проверкой auth.uid().
  Метаданные, содержимое произвольной cookie и клиентский интерфейс не дают роль.
  Сетевые ошибки / недоступная проверка роли закрывают доступ.
- Ответы /admin — динамические, private/no-store, no-cache, Expires 0, noindex;
  глобального кэша приватных данных нет. DENY запрещает встраивание во frame.
- Login/logout принимают только POST с точным Origin своего HTTP Host, без доверия
  к forwarded-host. Redirect фиксированный: /admin либо /admin/login, без next URL.
- Поля валидируются на сервере, тело формы ограничено 8 KiB. Пароли не сохраняются,
  не попадают в URL и логи; ошибки не включают ответы Supabase или детали аккаунта.
  Ограничение частоты попыток предоставляет Supabase Auth (429 обработан).
- Logout использует local scope: закрывает текущую сессию; другие устройства не
  отключаются. Как у JWT в целом, уже скопированный access token может оставаться
  действующим до своего срока; local logout удаляет cookies и отзывает refresh token.
- Истёкший access token обновляется через Proxy при действующем refresh token;
  недействительная/отозванная сессия приводит на вход. Роль проверяется заново,
  поэтому её отзыв в БД не ждёт нового JWT.
- RLS из блока 05 остаётся дополнительной независимой границей. Миграции не нужны:
  используется существующий RPC и закрытая таблица ролей.

## Первый постоянный администратор — только владелец

1. Откройте Supabase Dashboard → **kos-jeans-dev** → Authentication → Users.
2. Add user → Create new user: собственный email и собственный пароль. Пароль
   вводите только в Supabase; не присылайте в чат и не сохраняйте в репозитории.
   Подтвердите email (Auto confirm при доверенном ручном создании) либо завершите
   подтверждение по письму. При существующей записи не создавайте дубликат.
3. Откройте запись; скопируйте **User UID**. Сверьте email и проект. Сообщите
   «Назначаю UUID <полный UUID> администратором kos-jeans-dev». Codex проверит
   существование/подтверждение именно этой записи и назначит только этот UUID.
   Автоматического назначения первому вошедшему пользователю нет.
4. Альтернатива — выполнить назначение самостоятельно через SQL Editor. Сначала
   проверьте запись (подставьте UUID своей записи, не оставляйте placeholder):

```sql
select id, email, email_confirmed_at from auth.users
where id = '<ПРОВЕРЕННЫЙ_UUID>'::uuid;
```

После проверки email, UUID и своего решения назначить роль:

```sql
begin;
do $$
declare target uuid := '<ПРОВЕРЕННЫЙ_UUID>'::uuid;
begin
  if not exists (select 1 from auth.users where id = target and email_confirmed_at is not null)
  then raise exception 'Verified Auth account required'; end if;
  insert into private.admin_users(user_id) values(target) on conflict do nothing;
end $$;
commit;
```

5. Откройте Preview → `/admin/login`, введите свой email/пароль. Dashboard должен
   открываться и после обновления. Для ручной приёмки проверьте выход, затем прямой
   переход в `/admin/orders`: он должен вернуть на вход.
6. Для восстановления пароля используйте Authentication → Users → свою запись →
   Reset password (нужны корректные email settings и Auth URL). Публичного
   восстановления/регистрации в магазине в этом блоке нет.

Не назначайте роль через user_metadata/app_metadata: они не используются для доступа.
Не давайте роли аккаунтам тестового сценария. Постоянный администратор не создаётся
и не удаляется тестами; имя/email владельца и пароль в отчёты не записываются.

## Supabase / Vercel

Достаточно существующих `NEXT_PUBLIC_SUPABASE_URL` и
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, доступных всем Preview. Новых env нет.
`VERCEL_ENV=production` намеренно отключает Auth интеграцию с dev даже при случайно
добавленных переменных. Production к kos-jeans-dev не подключать.

Вход по паролю не использует email redirect URL и не требует wildcard разрешения
Vercel. Для будущих email recovery/invite flows добавляйте только фактический
Preview-host и локальный `http://127.0.0.1:3008` в Authentication → URL Configuration
→ Redirect URLs; текущий вход не зависит от этих настроек. Site URL и Production
для проверки этого блока менять не требуется. Public signup должен оставаться disabled.

## Проверки

- `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Локальные unit/SQL тесты: успешный проверенный admin, ordinary/anonymous,
  метаданные, отзыв роли, истечение/ошибки сессии, Origin, RLS, private roles.
- `npm run admin:test:hosted -- --dev-only` при production-сборке на 3008:
  реальные HTTP redirect/cache/CSRF, неверный пароль, одноразовый ordinary account
  с поддельными metadata, попытка записи role, RLS, tampered cookie и logout,
  регрессия публичных страниц. Случайный пароль ordinary account существует только
  в памяти теста, никому не выдаётся; запись удаляется в finally. Admin роль не назначается.
- Положительный настоящий вход требует владельца и подтверждённого постоянного UUID.
  Unit/SQL тесты не подменяют эту приёмку. Статус блока не done до живой проверки.

Источники: [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client),
[Next.js authentication](https://nextjs.org/docs/app/guides/authentication).

## Адрес для приёмки

[Вход в Preview](https://kos-jeans-git-feat-block-08-admin-auth-fedir-team.vercel.app/admin/login),
[Draft PR #8](https://github.com/expidito/kos-jeans/pull/8).
Прямой /admin и отказ неверным данным проверены в опубликованном Preview.
Учётная запись владельца проверена и роль назначена после явного подтверждения
точного UUID (2026-11-24). Пароль не запрашивался и не менялся.
Статус blocked: живой admin login/logout/refresh и закрытый Dashboard ожидают
входа владельца непосредственно на странице Preview.
