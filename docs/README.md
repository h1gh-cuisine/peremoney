# Документация Peremoney

Актуально на 23 августа 2026 года. Документы описывают фактическую реализацию; исходное бизнес-ТЗ находится в корне проекта (`docs.md`, `docs-agent.md`). Секреты, токены и реальные пароли здесь намеренно не приводятся.

## Состав

- [Обзор продукта](01-product.md) — назначение, роли и пользовательские сценарии.
- [Архитектура](02-architecture.md) — компоненты и потоки данных.
- [Локальный запуск](03-local-development.md) — установка, миграции и запуск.
- [Конфигурация](04-configuration.md) — переменные окружения.
- [API](05-api.md) — маршруты, права и назначение операций.
- [Модель данных](06-data-model.md) — сущности PostgreSQL/Prisma.
- [Интеграции](07-integrations.md) — Leads Factory, Точка, Telegram и fanout.
- [Эксплуатация](08-operations.md) — health, scheduler, backup, диагностика.
- [Тестирование](09-testing.md) — тестовые контуры и команды.
- [Безопасность](10-security.md) — модель доступа и правила эксплуатации.

## Быстрые ссылки

- Frontend по умолчанию: `http://localhost:3010`
- API: `http://localhost:4010/api`
- Swagger UI: `http://localhost:4010/api/docs`
- OpenAPI JSON: `http://localhost:4010/api/docs-json`
- Liveness: `GET /api/health`
- Readiness: `GET /api/health/ready`

Порты 3010/4010 используются в QA-конфигурации проекта. Значение backend по умолчанию без `PORT` — 4000.
