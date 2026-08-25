# Тестирование

Подробные требования и история прогонов находятся в корне: `TEST_CASES.md`, `docs-testing.md`, `TEST_REPORT_2026-08-21.md`, `WORKLOG.md`.

## Автоматические проверки

```bash
cd server
npm run check
npm run test:integration

cd ../client
npm test
npm run build
```

Requirements smoke запускается только на отдельной QA-БД/локальном стенде:

```bash
cd server
QA_API_URL=http://127.0.0.1:4010/api \
DATABASE_URL='postgresql://peremoney:peremoney@localhost:5433/peremoney?schema=public' \
node scripts/requirements-smoke.mjs
```

## Browser regression

1. Smoke: загрузка, login/logout, console и network.
2. Все маршруты и защита прямой навигации.
3. `MASTER`, `FULL`, `LIMITED`, включая скрытые разделы и запрет mutation.
4. Контакты, лиды, звонки, CSV и фильтры.
5. Источники, теги, пагинация, sync и automation.
6. Плательщик, баланс, платежи, формы счёта без случайного live-submit.
7. Master dashboard/projects/payments, длинные имена и меню в границах viewport.
8. Валидация, повторы submit, ошибки API и пустые состояния.
9. Viewports desktop/tablet/mobile.
10. Повтор затронутых сценариев после каждого исправления.

## Live-интеграции

- Leads Factory readonly можно проверять на выделенном проекте.
- Mutation smoke требует явного флага и тестовых данных.
- Положительный сценарий Точки допустим только с контролируемым плательщиком и согласованной оплатой.
- Реальные токены и полные payload с персональными данными не сохраняются в отчётах.

## Критерий PASS

Ожидаемый результат формируется из бизнес-ТЗ, а не из текущего интерфейса. Для каждого FAIL фиксируются шаги, expected, actual, роль, endpoint/страница и доказательство. Дефект сначала покрывается тестом, затем исправляется и перепроверяется.
