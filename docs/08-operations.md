# Эксплуатация

## Наблюдаемость

- `/api/health` проверяет liveness.
- `/api/health/ready` проверяет PostgreSQL.
- HTTP middleware пишет method, path, status, duration и request ID без токенов.
- Ошибки scheduler содержат run ID, task и безопасное сообщение.
- `/api/cabinets/:id/scheduled-runs` показывает последние 100 операций.

Статус 304 для GET — нормальный HTTP cache response, не ошибка. OPTIONS 204 — CORS preflight.

## Расписание (МСК)

- 09:00 — `SOURCES_SYNC`.
- 11:00 и 15:00 — `CONTACTS_SYNC`.
- 18:00 — `TAG_AUTOMATION`.
- 20:00 — `APPLY_SCHEDULE` и `SCRIPT_SYNC`.

Worker проверяет текущий и предыдущий день, чтобы восстановить пропущенные слоты после перезапуска. После трёх неудач run становится `FAILED`.

## Backup и restore

```bash
cd server
./scripts/backup-postgres.sh /absolute/path/peremoney.dump
CONFIRM_RESTORE=peremoney ./scripts/restore-postgres.sh /absolute/path/peremoney.dump
```

Backup не перезаписывает существующий файл. Restore разрушителен для текущих данных и требует явного подтверждения. Перед production-restore проверяйте dump восстановлением в отдельную БД.

## Диагностика интеграций

- `fetch failed`: сеть, DNS, TLS, VPN или недоступность провайдера.
- Provider 401/403: токен или права.
- Provider 404: неверный service path или внешний ID.
- Provider 422: неверный DTO; безопасные `providerDetails` возвращаются без входных секретов.
- `result.items is not iterable`: несовпадение envelope внешнего списка; сравнить live shape с адаптером.
- Счёт `UNCERTAIN`: нельзя автоматически повторять без reconciliation — внешний документ мог быть создан.

## Релизный минимум

1. Миграции применены.
2. Backend и frontend build зелёные.
3. Unit/integration tests зелёные.
4. Health/readiness зелёные.
5. Секреты заданы через окружение.
6. Публичный webhook использует HTTPS.
7. Backup и тест восстановления актуальны.
8. Выполнен browser smoke для MASTER, FULL и LIMITED.
