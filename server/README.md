# Peremoney API

Backend: NestJS + PostgreSQL + Prisma.

## Локальный запуск

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run prisma:generate
npm run prisma:deploy
npm run start:dev
```

- API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/api/health`

Мастер-пользователь создаётся при первом запуске из `MASTER_LOGIN` и `MASTER_PASSWORD`. Значение `JWT_SECRET` должно содержать не менее 32 случайных символов. Сгенерированные пароли сотрудника и клиента возвращаются только в ответе на создание кабинета; в БД сохраняются bcrypt-хэши.

Для синхронизации CRM заполните `LEADS_FACTORY_TOKEN`. Токен хранится только в окружении и не передаётся frontend. Ручной запуск: `POST /api/cabinets/{cabinetId}/sync/answers` с ролью `MASTER` или `FULL`.

Для восстанавливаемой выдачи credentials после безопасного повтора создания проекта задайте стабильный `CREDENTIAL_DERIVATION_SECRET` длиной не менее 32 символов. Если он не указан, используется `JWT_SECRET`; смена этого секрета меняет воспроизводимые тестовые credentials.

## Счета Точки и оплаты

- Заполните `TOCHKA_JWT`, `TOCHKA_CUSTOMER_CODE` и `TOCHKA_ACCOUNT_ID`; JWT должен иметь `ManageInvoiceData` и `ManageWebhookData`.
- Счёт создаётся через Точку, `documentId` сохраняется, PDF скачивается клиентом через защищённый API.
- `POST /api/webhooks/tochka` принимает `text/plain` JWT, проверяет RS256-подпись публичным ключом Точки и начисляет баланс только при точном совпадении ИНН, суммы и номера счёта.
- Публичный HTTPS-адрес webhook задаётся как `TOCHKA_WEBHOOK_URL`; до появления домена переменная остаётся пустой.
- Telegram настраивается через `TELEGRAM_BOT_TOKEN` и comma-separated `TELEGRAM_CHAT_IDS`. Ошибка уведомления не откатывает оплату.
- Секреты нельзя коммитить или передавать frontend. После публикации секрета его необходимо перевыпустить.

## Проверки

```bash
npm run check
```

## Health и PostgreSQL backup

- `GET /api/health` — liveness процесса.
- `GET /api/health/ready` — readiness с проверкой PostgreSQL.
- `./scripts/backup-postgres.sh /absolute/path/backup.dump` — backup без перезаписи существующего файла.
- `CONFIRM_RESTORE=peremoney ./scripts/restore-postgres.sh /absolute/path/backup.dump` — явно подтверждённое восстановление.
