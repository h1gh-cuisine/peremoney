# Интеграции

## Leads Factory

Base URL: `https://openapi.leads-factory.ru/v1`. Backend добавляет bearer token и не передаёт его frontend.

Используемые provider routes:

- `/crm/open-api/projects/types`, `/crm/open-api/projects`
- `/crm/open-api/projects/{id}/answers`
- `/crm/open-api/answers/{id}/calls`
- `/crm/open-api/projects/{id}` и `/script`
- `/crm/open-api/projects/{id}/integrations/{name}`
- `/vdl/api/tags/get_by_project_and_date/{id}`
- `/vdl/api/tags/update/{tagId}`, `/vdl/api/tags/update`
- `/vdl/api/tags/available_tags_types`
- `/vdl/api/sources/get_by_project/{id}`
- `/vdl/api/sources/add_all/{id}`
- `/vdl/api/sources/update_settings`

Контрактные особенности: `regions` — массив integer; источник создаётся с `source_from` из enum `ishod|parsed|web`; списки sources/tags могут иметь envelopes `sources|tags` и `total_count`. GET/PATCH повторяются до трёх раз при сетевой ошибке/502/504; небезопасные POST/PUT автоматически не повторяются.

Readonly smoke:

```bash
cd server
QA_PROVIDER_PROJECT_ID=<test-project> node scripts/provider-readonly-smoke.mjs
```

Mutation smoke требует отдельного тестового проекта и явного `ENABLE_PROVIDER_MUTATIONS=YES`. Никогда не запускайте его на клиентском проекте.

## Точка Банк

Backend вызывает UAPI только со стороны сервера. Для создания счёта нужны JWT, customer code и account ID. PDF проксируется через защищённый локальный endpoint.

Webhook приходит как `text/plain` JWT. Подпись RS256 проверяется локальным PEM или публичным ключом Точки. Событие сохраняется по уникальному external ID; баланс начисляется один раз после точного сопоставления.

Никогда не проводите положительный live-тест со случайными реквизитами. Используйте контролируемое тестовое юрлицо/контур. Негативная 4xx-проверка должна завершаться `FAILED`, а сетевая неопределённость — `UNCERTAIN`.

## Telegram

После принятой оплаты backend отправляет уведомление в перечисленные chat IDs. Ошибка Telegram логируется, но не откатывает банковскую обработку.

## Fanout

Внешний источник обращается к `POST /api/fanout/:publicId/leads` с `X-Fanout-Token`. В БД хранится только hash токена. Один входящий контакт доставляется всем активным назначениям, а каждый результат фиксируется в `FanoutDelivery` для повторной обработки и аудита.
