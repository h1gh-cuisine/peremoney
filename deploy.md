# Deployment runbook Peremoney

Этот runbook предназначен для агента или инженера, который разворачивает именно этот репозиторий. Он дополняет `server/README.md` и `docs/04-configuration.md` практическими ограничениями проекта.

## 1. Состав системы

- `client` — Next.js 15 и React 19.
- `server` — NestJS 11 и Prisma 6.
- PostgreSQL 17.
- Интеграции: Leads Factory, Точка и Telegram.

Рекомендуемая схема:

```text
Internet -> HTTPS reverse proxy
              |-- /      -> Next.js
              `-- /api/* -> NestJS -> PostgreSQL
                                  |-> Leads Factory
                                  |-> Точка
                                  `-> Telegram
```

## 2. Критические правила

1. Деплоить только известный commit/артефакт, не грязное рабочее дерево.
2. Проверить, что в commit попали все untracked-файлы, особенно Prisma migrations.
3. Не копировать `.env` в git, CI-логи, image layers или frontend bundle.
4. Перед production migration создать и проверить backup.
5. В production использовать `prisma migrate deploy`, не `migrate dev`.
6. Не делать live POST/PATCH в Точку или Leads Factory как smoke без согласованного тестового проекта. Счёт Точки — реальный банковский документ.
7. Пока запускать один backend instance: фоновые циклы не рассчитаны на произвольное горизонтальное масштабирование.

Перед релизом:

```bash
git status --short
git ls-files server/prisma/migrations
git rev-parse HEAD
```

Сохранить SHA в журнале релиза.

## 3. Требования к host

- Node.js 20 LTS; проект проверен на `20.19.x`.
- PostgreSQL 17.
- Исходящий HTTPS к `openapi.leads-factory.ru`, `enter.tochka.com`, `api.telegram.org`.
- Корректные DNS, NTP и свободное место для БД, backup и build.

Для Leads Factory рекомендуется:

```env
NODE_OPTIONS=--dns-result-order=ipv4first
```

На некоторых сетях без IPv4-first соединение с Leads Factory нестабильно. Проверять доступ из того же network namespace, где работает Node.

## 4. Backend environment

Хранить production values в secret manager либо закрытом `server/.env`.

### 4.1. Основные переменные

```env
NODE_ENV=production
HOST=0.0.0.0
PORT=4010
DATABASE_URL=postgresql://USER:PASSWORD@DB_HOST:5432/peremoney?schema=public
JWT_SECRET=<минимум 32 случайных символа>
JWT_EXPIRES_IN=8h
CREDENTIAL_DERIVATION_SECRET=<отдельный стабильный секрет>
INTEGRATION_ENCRYPTION_KEY=<отдельный стабильный секрет>
MASTER_LOGIN=<production login>
MASTER_PASSWORD=<первичный production password>
PROJECT_DELETE_SECRET=<отдельный случайный код удаления проектов>
CORS_ORIGINS=https://peremony.ru,https://www.peremony.ru
SWAGGER_ENABLED=false
```

Тонкости:

- Смена `JWT_SECRET` отзывает все JWT.
- Смена `CREDENTIAL_DERIVATION_SECRET` меняет восстанавливаемые credentials незавершённых idempotent-операций.
- `INTEGRATION_ENCRYPTION_KEY` шифрует bot token Telegram/MAX проектов. После смены старые токены не расшифровать.
- `CORS_ORIGINS` — точные origins через запятую, без path и wildcard.
- В production Swagger должен быть выключен.
- `MASTER_LOGIN` и `MASTER_PASSWORD` создают MASTER только при первом запуске. Смена env не меняет пароль существующего MASTER: bootstrap выполняет upsert с пустым update.
- `PROJECT_DELETE_SECRET` обязателен: без него endpoint удаления fail-closed отвечает 503. Не использовать пароль MASTER и не передавать его в `NEXT_PUBLIC_*`.

### 4.2. Leads Factory

```env
LEADS_FACTORY_BASE_URL=https://openapi.leads-factory.ru/v1
LEADS_FACTORY_TOKEN=<bearer token>
DOMAIN_JOB_POLL_MS=60000
SCHEDULER_POLL_MS=60000
CONTACTS_POLL_MS=120000
```

- Base URL заканчивается на `/v1`; код сам добавляет `/crm/open-api` и `/vdl/api`.
- Новый проект создаётся у провайдера сразу на паузе.
- Нулевой баланс, общая пауза и нерабочий день отправляют `status=pause` и выключают закуп/обзвон.
- В 20:00 МСК применяется расписание следующего дня.
- Частные переключатели закупа/обзвона меняют только свой provider status.
- Ошибка синхронизации создаёт `ScheduledRun` для retry. Мониторить `SchedulerService`.

### 4.3. Точка и polling

```env
TOCHKA_API_BASE_URL=https://enter.tochka.com/uapi
TOCHKA_JWT=<JWT Точки>
TOCHKA_CUSTOMER_CODE=<customer_code>
TOCHKA_ACCOUNT_ID=<точный accountId Точки>
TOCHKA_INVOICE_POLL_ENABLED=true
TOCHKA_INVOICE_POLL_MS=60000
```

- Для создания счёта, PDF и polling нужен consent `ManageInvoiceData`.
- `ManageWebhookData` нужен только для webhook.
- `403 Forbidden by consent` означает недостаточные права токена, не CORS.
- `TOCHKA_CUSTOMER_CODE` должен совпадать с claim банковского JWT.
- `TOCHKA_ACCOUNT_ID` брать из кабинета/API Точки без ручного преобразования.
- Poller включается только при наличии `TOCHKA_JWT`; минимальный интервал — 10 секунд.
- При `payment_paid` баланс начисляется атомарно. Не обходить `BalanceEntry`, `PaymentAudit`, `bankPaymentId`, snapshot-поля и `telegramNotifiedAt`.

Клиент Точки использует IPv4 и добавляет Russian Trusted Root CA к стандартному trust store Node. TLS verification не отключать. Для корпоративного proxy:

```env
NODE_EXTRA_CA_CERTS=/absolute/path/to/corporate-root.pem
```

Никогда не использовать `NODE_TLS_REJECT_UNAUTHORIZED=0`.

### 4.4. Необязательный webhook Точки

Основной подтверждённый механизм — polling. Webhook можно включить дополнительно:

```env
TOCHKA_WEBHOOK_URL=https://peremony.ru/api/webhooks/tochka
TOCHKA_WEBHOOK_PUBLIC_KEY_URL=https://enter.tochka.com/doc/openapi/static/keys/public
TOCHKA_WEBHOOK_PUBLIC_KEY=
```

Proxy должен сохранять `Content-Type: text/plain`, не преобразовывать JWT body в JSON, пропускать до 32 KiB и публиковать endpoint только по HTTPS. В PEM допустимы переносы как `\n`.

### 4.5. Системный Telegram оплат

```env
TELEGRAM_BOT_TOKEN=<token системного бота Peremoney>
TELEGRAM_CHAT_IDS=-1004437027549,-5539134940
```

- Добавить бота в обе группы и разрешить отправку.
- Не путать его token с токенами прямых интеграций кабинетов.
- После оплаты polling отправляет проект, плательщика, ИНН, сумму, количество и номер счёта.
- `telegramNotifiedAt` ставится после доставки во все чаты. При ошибке оплата не откатывается, уведомление повторяется следующим polling cycle.

### 4.6. Rate limits

```env
LOGIN_RATE_LIMIT=10
FANOUT_RATE_LIMIT=120
PROJECT_DELETE_RATE_LIMIT=5
PROJECT_DELETE_RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_WINDOW_MS=60000
```

Rate limit process-local. До нескольких replicas нужен общий storage/lock и проверка client IP за proxy.

## 5. Frontend environment

`NEXT_PUBLIC_API_URL` задаётся до build:

```env
NEXT_PUBLIC_API_URL=https://peremony.ru/api
```

Переменная попадает в browser bundle. Секреты в `NEXT_PUBLIC_*` запрещены. После смены URL frontend пересобрать.

Маршруты Next отмечены как `Static`, но это только prerender оболочек. Данные загружаются из API. Dev использует `.next-dev`, production — `.next`. Не запускать параллельные production builds в одном checkout.

## 6. PostgreSQL

### 6.1. Docker Compose

`server/docker-compose.yml` предназначен для локальной разработки. В production:

- заменить пароль;
- не публиковать порт БД наружу;
- использовать persistent volume или managed PostgreSQL;
- настроить backup и disk monitoring.

Изменение `POSTGRES_PASSWORD` не меняет пароль уже созданного volume. Это уже вызывало Prisma `P1000`: контейнер healthy, но `DATABASE_URL` содержит другие credentials.

### 6.2. Backup

Из каталога `server`:

```bash
./scripts/backup-postgres.sh /absolute/backup/path/peremoney-YYYYMMDD-HHMM.dump
pg_restore --list /absolute/backup/path/peremoney-YYYYMMDD-HHMM.dump
```

Скрипт не перезаписывает файл. Для managed DB дополнительно использовать provider snapshot.

Restore разрушителен и требует отдельного подтверждения:

```bash
CONFIRM_RESTORE=peremoney ./scripts/restore-postgres.sh /absolute/path/backup.dump
```

### 6.3. Миграции

```bash
cd server
npm run prisma:generate
npm run prisma:deploy
npx prisma migrate status
```

Миграции выполнять до старта новой версии. Последние migrations нужны для мастер-сотрудников, прямых интеграций и Telegram marker. Автоматического safe down migration нет.

## 7. Dependencies, tests и build

Репозиторий не является единым npm workspace. Backend устанавливается первым: client tests используют Jest из `server/node_modules`.

### Backend

```bash
cd server
npm ci
npm run prisma:generate
npm run check
npm run start:prod
```

Production entrypoint — `server/dist/src/main.js`, он учтён в `package.json`.

### Frontend

```bash
cd client
npm ci
NEXT_PUBLIC_API_URL=https://peremony.ru/api npm test -- --runInBand
NEXT_PUBLIC_API_URL=https://peremony.ru/api npm run build
NEXT_PUBLIC_API_URL=https://peremony.ru/api npm start -- -p 3000
```

## 8. Порядок релиза

1. Зафиксировать SHA и проверить clean release checkout.
2. Проверить migrations и lock-файлы.
3. Проверить secrets без вывода значений.
4. Создать и проверить backup.
5. Выполнить `npm ci`, tests и builds в новом release/image.
6. Запустить `prisma migrate deploy`.
7. Перезапустить один backend instance.
8. Дождаться readiness.
9. Переключить frontend.
10. Выполнить smoke и записать результат.

Не собирать production поверх работающего dev-процесса в том же каталоге.

## 9. Reverse proxy

- TLS с актуальным сертификатом.
- `/api/*` проксируется без удаления `/api`.
- `/` и `/_next/*` идут в Next.js.
- Передавать `Host`, `X-Forwarded-For` и `X-Forwarded-Proto`.
- Timeout должен превышать 15 секунд внешнего запроса Точки.
- Не кешировать авторизованные API responses.
- Не логировать `Authorization`, JWT webhook, cookie и bodies с секретами.
- Сохранять `text/plain` body webhook.

Если frontend и API на разных origins, frontend origin добавить в `CORS_ORIGINS`.

## 10. Фоновые процессы и replicas

Backend содержит `SchedulerService`, `DomainSourceJobsService` и `TochkaInvoicePollerService`. До общего distributed lock запускать одну backend replica. Иначе возможны параллельные provider requests и Telegram-дубли до записи marker.

Process manager должен обеспечивать restart, graceful stop, memory limit, log rotation и startup после БД/migrations.

## 11. Post-deploy smoke

```bash
curl -fsS https://peremony.ru/api/health
curl -fsS https://peremony.ru/api/health/ready
curl -I https://peremony.ru/login
```

Проверить:

- health и ready возвращают `200`;
- `/login`, `/privacy` и `/offer` доступны;
- `/api/docs` выключен;
- браузер не показывает CORS/network errors;
- MASTER login и отдельная project session работают;
- проекты и сотрудники загружаются;
- polling Точки запущен с ожидаемым интервалом;
- нет циклов `P1000`, TLS errors, `fetch failed` или `Forbidden by consent`.

Leads Factory сначала проверять read-only GET. Mutations — только на тестовом проекте.

Точку сначала проверять read-only. Не создавать счёт ради health-check. После согласованного E2E проверить ровно одно начисление, `PaymentAudit`, `BalanceEntry`, `bankPaymentId` и Telegram в обеих группах.

## 12. Мониторинг

Алерты нужны на:

- readiness, restarts, PostgreSQL disk/connections и возраст backup;
- повторяющиеся failures scheduler/domain jobs;
- Leads Factory `401/403/422/5xx` и `fetch failed`;
- Точку `Forbidden by consent`, transport errors, `UNCERTAIN/FAILED` invoices;
- `PAID` с `telegramNotifiedAt IS NULL` дольше нескольких polling cycles;
- долгие `PENDING` payments;
- расхождение платежного реестра и баланса;
- растущую очередь retry `ScheduledRun`.

Provider payload с персональными данными и secrets не должен попадать в логи.

## 13. Rollback

Для application rollback переключить frontend/backend на предыдущий артефакт, не откатывая БД автоматически. Проверить совместимость старого кода с уже применённой schema.

Prisma не делает безопасный automatic down migration. Restore допустим только после остановки записи, аварийного backup текущего состояния и явного подтверждения владельца.

## 14. Definition of done

Deployment завершён, когда:

- известен deployed SHA;
- `npm ci`, tests и обе builds успешны;
- backup создан и проверен;
- все migrations применены;
- readiness стабильно `200`;
- CORS содержит только нужные origins, Swagger выключен;
- Leads Factory доступен с production host;
- polling Точки работает без consent/TLS ошибок;
- системный Telegram-бот пишет в обе группы;
- secrets отсутствуют в git, frontend и logs;
- зафиксированы smoke и rollback plan.
