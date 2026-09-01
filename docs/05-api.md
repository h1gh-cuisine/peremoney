# HTTP API

Base path: `/api`. Интерактивная схема — `/api/docs`, OpenAPI JSON — `/api/docs-json`. Защищённые маршруты принимают `Authorization: Bearer <JWT>`.

## Авторизация

- `POST /auth/login` — логин, возвращает token и пользователя; rate-limited.
- `GET /auth/me` — текущий пользователь.
- `POST /auth/logout` — увеличивает `sessionVersion`, инвалидируя выданную сессию.

## Health

- `GET /health` — процесс отвечает.
- `GET /health/ready` — приложение готово и PostgreSQL доступен.

## Кабинеты

- `GET /cabinets` — список, только MASTER.
- `POST /cabinets` — создать проект/кабинет, только MASTER; операция поддерживает идемпотентность.
- `GET /cabinets/provider/project-types` — типы проектов Leads Factory, MASTER.
- `GET /cabinets/me` — кабинет текущего пользователя.
- `GET /cabinets/:id` — кабинет с проверкой доступа.
- `GET /cabinets/:id/provider/integrations/:name` — `telegram`, `bitrix`, `amocrm` или `email`; MASTER/FULL.
- `PATCH /cabinets/:id/visibility` — видимость разделов; MASTER/FULL.
- `PATCH /cabinets/:id/schedule` — расписание; MASTER/FULL.
- `PATCH /cabinets/:id/settings` — настройки автоматизации; MASTER/FULL.
- `PATCH /cabinets/:id/billing` — цены/баланс/единицы; MASTER.
- `PATCH /cabinets/:id/master-project` — master-параметры проекта; MASTER.
- `POST /cabinets/:id/clone` — клонирование; MASTER.

## CRM

- `POST /cabinets/:cabinetId/sync/answers` — ручная синхронизация; MASTER/FULL.
- `GET /cabinets/:cabinetId/contacts` — контакты с проверкой видимости.
- `GET /cabinets/:cabinetId/leads` — лиды.
- `PATCH /cabinets/:cabinetId/leads/:leadId` — обратная связь, статус и сумма; MASTER/FULL, LIMITED не редактирует.
- `GET /cabinets/:cabinetId/leads/:leadId/calls` — записи поставщика.

## Источники и scheduler

- `GET /cabinets/:cabinetId/sources` — пагинированный список и фильтры.
- `POST /cabinets/:cabinetId/sources/sync` — синхронизация; MASTER/FULL.
- `POST /cabinets/:cabinetId/sources` — добавить источники; MASTER/FULL.
- `PATCH /cabinets/:cabinetId/sources/:tagId` — включить/отключить тег; MASTER/FULL.
- `PATCH /cabinets/:cabinetId/sources/automation/settings` — параметры автоматизации; MASTER/FULL.
- `POST /cabinets/:cabinetId/sources/automation/run` — ручной прогон; MASTER/FULL.
- `GET /cabinets/:cabinetId/sources/meta/tag-types` — типы тегов.
- `GET /cabinets/:cabinetId/scheduled-runs` — последние 100 запусков.

## Финансы

- `GET|PUT /cabinets/:cabinetId/payer` — получить/сохранить плательщика.
- `GET /cabinets/:cabinetId/finance/payments` — платежи.
- `GET /cabinets/:cabinetId/finance/summary` — баланс денег и единиц.
- `POST /cabinets/:cabinetId/finance/invoices` — создать счёт в Точке; нужен idempotency key.
- `GET /cabinets/:cabinetId/finance/invoices/:paymentId/pdf` — PDF счёта.
- `POST /cabinets/:cabinetId/finance/closing-acts` — данные/формирование акта.
- `GET /cabinets/:cabinetId/dashboard` — клиентская аналитика за период.
- `GET /master/payments` — все платежи, MASTER.
- `PATCH|DELETE /master/payments/:id` — управление платежом, MASTER.
- `GET /master/dashboard` — master-аналитика, MASTER.
- `GET|POST /webhooks/tochka` — health и приём `text/plain` JWT webhook.

## Fanout

- `POST /fanout/:publicId/leads` — публичный приём; заголовок `X-Fanout-Token`, rate-limited.
- `GET|POST /master/fanout/sources` — список/создание источников, MASTER.
- `PATCH /master/fanout/sources/:id/destinations` — назначения, MASTER.
- `GET /master/fanout/sources/:id/deliveries` — журнал доставок, MASTER.
- `GET /audit-log/leads-factory-errors` — отдельный журнал финальных HTTP- и сетевых ошибок Leads Factory; MASTER + `X-Audit-Secret`, фильтры и пагинация как у `GET /audit-log`.

DTO валидируются глобальным `ValidationPipe` с `whitelist` и преобразованием типов. Точные request/response schemas следует брать из OpenAPI текущей сборки.
