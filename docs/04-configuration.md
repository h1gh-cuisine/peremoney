# Конфигурация

Значения хранятся в `server/.env` и `client/.env.local`. Эти файлы и секреты не коммитятся.

## Backend

| Переменная | Назначение | Обязательность |
|---|---|---|
| `PORT`, `HOST` | Адрес HTTP-сервера; defaults `4000`, `0.0.0.0` | нет |
| `DATABASE_URL` | PostgreSQL URL для Prisma | да |
| `JWT_SECRET` | Подпись JWT, минимум 32 случайных символа | да |
| `INTEGRATION_ENCRYPTION_KEY` | Отдельный секрет для AES-GCM шифрования bot token Telegram/MAX; при отсутствии временно используется `JWT_SECRET` | рекомендуется |
| `JWT_EXPIRES_IN` | TTL JWT, default `8h` | нет |
| `MASTER_LOGIN`, `MASTER_PASSWORD` | Первичный MASTER | да |
| `CREDENTIAL_DERIVATION_SECRET` | Стабильное восстановление credentials при retry | рекомендуется |
| `LEADS_FACTORY_BASE_URL` | Default `https://openapi.leads-factory.ru/v1` | нет |
| `LEADS_FACTORY_TOKEN` | Bearer token Leads Factory | для интеграции |
| `TOCHKA_API_BASE_URL` | Default `https://enter.tochka.com/uapi` | нет |
| `TOCHKA_JWT` | JWT Open API Точки | для счетов |
| `TOCHKA_CUSTOMER_CODE` | Код клиента из договора/JWT | для счетов |
| `TOCHKA_ACCOUNT_ID` | Счёт получателя | для счетов |
| `TOCHKA_INVOICE_POLL_ENABLED` | Периодически сверять статусы счетов с Точкой; default `true` | нет |
| `TOCHKA_INVOICE_POLL_MS` | Интервал сверки; default `60000`, minimum `10000` | нет |
| `TOCHKA_WEBHOOK_URL` | Публичный HTTPS webhook | для уведомлений банка |
| `TOCHKA_WEBHOOK_PUBLIC_KEY_URL` | URL ключа проверки подписи | нет |
| `TOCHKA_WEBHOOK_PUBLIC_KEY` | PEM-ключ вместо загрузки по URL | нет |
| `TELEGRAM_BOT_TOKEN` | Bot token уведомлений | нет |
| `TELEGRAM_CHAT_IDS` | Chat IDs через запятую | нет |
| `DOMAIN_JOB_POLL_MS` | Частота обработки domain jobs | нет |
| `SCHEDULER_POLL_MS` | Частота планировщика, минимум 1000 ms | нет |
| `LOGIN_RATE_LIMIT` | Логинов с одного IP за окно | нет |
| `FANOUT_RATE_LIMIT` | Входящих fanout-запросов за окно | нет |
| `RATE_LIMIT_WINDOW_MS` | Окно rate limit | нет |

## Frontend

| Переменная | Назначение |
|---|---|
| `NEXT_PUBLIC_API_URL` | Полный публичный URL API, default `http://localhost:4010/api` |

Переменные с префиксом `NEXT_PUBLIC_` попадают в клиентский bundle. Никогда не помещайте в них токены.

## Проверка конфигурации

- Не печатайте `.env`, JWT или bearer-токены в CI/logs.
- `TOCHKA_CUSTOMER_CODE` должен соответствовать claim банковского JWT.
- JWT должен иметь `ManageInvoiceData`: этого достаточно для создания, скачивания и polling статуса счёта. `ManageWebhookData` нужен только для webhook-схемы.
- Для Точки нужны права API, достаточные для счетов и webhook.
- После публикации секрета немедленно перевыпустите его.
