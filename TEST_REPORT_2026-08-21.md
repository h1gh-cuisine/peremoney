# Итоговый отчёт тестирования Peremoney — 2026-08-21

## Основание и вердикт

Тестирование выполнено по `docs-testing.md` и `TEST_CASES.md` на локальной QA-среде с PostgreSQL 17.

**Вердикт: NOT READY FOR RELEASE.** Критерии раздела 20 `docs-testing.md` не выполнены: обнаружены открытые P0/P1 security/RBAC-дефекты, не выполнены все E2E, отсутствует browser-инфраструктура и live-контуры Точки/Leads Factory.

## Дополнение: browser-прогон во встроенном Browser

### Дополнение 2026-08-22: статический review интеграции Leads Factory

- FIXED: idempotency key теперь принадлежит заполненной форме и сохраняется при retry; редактирование после ошибки начинает новую попытку.
- FIXED: конкурентный запрос с тем же ключом атомарно блокируется до внешнего POST.
- FIXED: локальный cabinet/users и перевод операции в `SUCCEEDED` коммитятся одной Prisma-транзакцией; replay детерминированно возвращает те же credentials.
- FIXED: integration proxy применяет allowlist и не отдаёт provider token, webhook URL или password.
- FIXED: при создании сохраняется отображаемое имя менеджера вместо `MGR-*` ID.
- FIXED: позиционирование меню проекта ограничено viewport, включая узкий экран.
- Полный regression: backend 26 suites / 88 tests PASS, frontend 26 suites / 75 tests PASS; обе production-сборки PASS.
- Реальный provider POST не выполнялся: live E2E остаётся ручным сценарием с владельцем тестового токена.

### Дополнение 2026-08-22: общесистемные дефекты

- FIXED: AUTH-13 — logout инвалидирует старые JWT через серверную версию сессии.
- FIXED: FIN-24 — создание счёта имеет серверную идемпотентность и блокирует повторный банковский POST.
- FIXED: SRC-14 — Sources API пагинируется по 200, frontend забирает все страницы, расчёт связей стал линейным.
- FIXED: FILE-01 — CSV formula injection нейтрализована и покрыта тестами.
- PASS: 13 Prisma migrations applied; backend 27/27 suites, 92/92 tests; frontend 26/26 suites, 80/80 tests; обе production-сборки успешны.
- BLOCKED: PDF акта и оставшиеся dependency High — npm registry повторно оборвал загрузку с `ECONNRESET`. Frontend dependency fix дополнительно требует проверяемого перехода Next 15→16.

Повторный прогон выполнен в `iab`; прежняя запись о недоступном browser runtime больше не актуальна.

- PASS: `/login`, MASTER login/logout, LIMITED login, master navigation/dashboard/projects, LIMITED dashboard, Leads empty state, Payer form, Settings route, Script read-only state.
- PASS: на пустых данных дашборд показал ровно 8 метрик без `NaN`/`Infinity`; master-навигация содержит только Дашборд/Проекты/Платежи.
- FAIL→FIXED: `/script` падал с `RangeError: Invalid time value` на ISO datetime. Добавлен красный regression-test, парсинг исправлен, browser retest PASS.
- FAIL→FIXED: provider HTML больше не вставляется в DOM через `dangerouslySetInnerHTML`; рендерится в `iframe sandbox=""` без `allow-scripts`.
- FAIL→FIXED: LIMITED Settings переведён в read-only UI: нет кнопки сохранения, интерактивных полей и блока «Управление доступом». Component regression и `iab` retest PASS.
- FAIL→FIXED: LIMITED write lead и API скрытых Contacts/Sources/Finance закрыты. Повторный requirements smoke на свежем backend в изолированном QA-порту: 17/17 PASS; LIMITED lead PATCH=403, FULL PATCH=200, hidden Contacts/Finance=403.
- Regression после фиксов: backend 25 suites / 77 tests PASS и production build PASS; frontend 25 suites / 71 tests PASS и production build PASS.
- Browser regression завершён в восстановленном `iab` на изолированном frontend `localhost:3011`: LIMITED `/settings` показывает только read-only уведомление без save, project controls и блока доступа; FULL `/settings` сохраняет полную форму и управление доступом; LIMITED `/leads` открывается в read-only контексте. В чистой вкладке console errors 0.

Итоговый вердикт остаётся **NOT READY FOR RELEASE**: logout invalidation, invoice idempotency, pagination 5000 sources, closing-act PDF, dependency High и внешние E2E не закрыты.

## Среда

- Backend: NestJS, QA API `http://127.0.0.1:4010/api`.
- Frontend: Next.js, основной QA UI `http://127.0.0.1:3010`; финальный browser-retest выполнен на изолированной копии тех же исходников через `http://localhost:3011`, поскольку старый dev-процесс `3010` требовал перезапуска после production build.
- PostgreSQL 17 в Docker, healthy, порт 5433.
- Схема: 10 миграций, up to date.
- Browser runtime: встроенный Browser (`iab`).
- Боевые секреты в отчёт и тестовые команды не выводились.

## Выполненные проверки

| Слой | Результат | Доказательство |
|---|---:|---|
| Backend unit/contract | PASS | 24 suites, 75 tests |
| Frontend unit/component | PASS | 24 suites, 68 tests |
| Backend coverage | WARN | statements 45.05%, branches 45.47%, lines 45.50% |
| Frontend coverage | WARN | statements 43.36%, branches 51.29%, lines 49.51% |
| Nest production build | PASS | `npm run build` |
| Next production build | PASS | `npm run build`, 17 static pages |
| PostgreSQL/API integration | PASS | 2 suites, 2 tests: core API/RS256 webhook и fan-out |
| Требования RBAC/API smoke | FAIL | 14 PASS / 3 FAIL из 17; фикстуры очищены |
| Health/readiness | PASS | 200/200, PostgreSQL up |
| OpenAPI | PASS | 200, 40 paths |
| Request ID | PASS | присутствует на health/readiness/OpenAPI |
| Login rate limit | PASS | 11-й запрос получил 429 |
| Backup/restore | PASS | custom backup восстановлен в отдельную БД, 17 public tables, временная БД удалена |
| Frontend HTTP smoke | PASS | `/login` вернул 200 |
| Browser/UI/visual | BLOCKED | browser runtime не предоставляет браузеров |
| Leads Factory read-only smoke | BLOCKED | TLS `SSL_ERROR_SYSCALL`/`fetch failed` до получения HTTP-ответа |
| Точка live invoice/webhook | BLOCKED | `TOCHKA_JWT`, customer/account и публичный HTTPS webhook URL не настроены |
| Dependency audit | FAIL | backend: 5 High; frontend: 3 High dependency chains |

## Подтверждённые дефекты

| ID | Severity | Требования | Результат |
|---|---|---|---|
| DEF-001 | Critical | AUTH-007, LEAD-002/005, AUTH-05 матрицы | LIMITED изменяет собственный лид: ожидался 403, фактически 200. В `CrmController.updateLead` write-проверка не включена. |
| DEF-002 | Critical | NAV-006, SET-012, E2E-007 | После скрытия раздела LIMITED сохраняет серверный доступ: Contacts и Finance вернули 200 вместо 403. Visibility применяется только в UI. |
| DEF-003 | Critical | SCRIPT-004, security 16.3 | HTML провайдера вставляется через `dangerouslySetInnerHTML` без sanitization или iframe isolation. Возможен stored XSS. |
| DEF-004 | High | LEAD-017, SRC-022, FILE-005 | CSV оставляет `=2+2`, `+cmd`, `@SUM(...)` активными формулами; кавычки не защищают Excel от formula injection. |
| DEF-005 | High | FIN-011/012 | Создание счёта не имеет серверного idempotency key. Double-submit защищён только в одном frontend-сеансе; refresh/timeout/retry может создать второй банковский счёт. |
| DEF-006 | High | AUTH-008 | Logout удаляет локальную сессию, но серверной инвалидизации JWT/deny-list нет; ранее выданный token остаётся действующим до expiry. |
| DEF-007 | High | SRC-011, performance 16.1 | У Sources отсутствует серверная и UI-пагинация; API возвращает весь набор. Требование 5000 строк не подтверждено, алгоритм связывания tags/leads квадратичный. |
| DEF-008 | High | MPAY-011 | Нет полного immutable audit «кто/до/после/причина/correlation» для ручных финансовых изменений; BalanceEntry не содержит actor/reason. |
| DEF-009 | High | PROJ-006 | Сотрудники/менеджеры управляются локальным Zustand store без persistent backend CRUD. |
| DEF-010 | High | PROJ-007–015, E2E-001/008 | Provider-aware создание проекта и серверная идемпотентность POST Leads Factory отсутствуют. |
| DEF-011 | High | PAYER-003 | Backend принимает произвольный JSON плательщика; форматы/длины ИНН, КПП, БИК и счетов не валидируются. |
| DEF-012 | High | FIN-015/017, E2E-009 | PDF закрывающего акта отсутствует; возвращаются только структурированные данные. |
| DEF-013 | High | security 16.3 | `npm audit --omit=dev`: backend — 5 High (включая `js-yaml`, `deepmerge-ts` chains), frontend — 3 High (`next`/`postcss`/`sharp` chains). |
| DEF-014 | Medium | AUTH-010 | Политика инвалидизации старых сессий после смены пароля не реализована/не определена. |
| DEF-015 | Process/High | sections 6, 21 | Полная трассировка отсутствует: `docs-testing.md` содержит 290 ID, `TEST_CASES.md` — 106 укрупнённых кейсов с несовместимой нумерацией. |

## Пройденные критические инварианты

- MASTER/FULL/LIMITED успешно входят и получают свой контекст.
- ANON получает 401 на защищённом API.
- LIMITED не читает другой кабинет подбором cabinet ID и не получает master list.
- `passwordHash` не возвращается в master projects list.
- Отрицательная цена проекта отклоняется 400.
- FULL может редактировать лид своего кабинета.
- Payer доступен LIMITED согласно текущему прочтению NAV-005/PAYER-002.
- RS256 webhook Точки, точное matching, idempotent bank `paymentId` и атомарное начисление покрыты unit+PostgreSQL integration.
- Fan-out PostgreSQL integration проходит.
- Backup реально восстановим.

## Blocked / Not run

- Все visual, keyboard, accessibility, responsive и cross-browser кейсы: отсутствует browser runtime и утверждённая browser/device matrix.
- Нагрузочные p50/p95/p99 и 5000-source UX: SLA и профиль нагрузки не утверждены; browser отсутствует.
- Leads Factory API-001–014 и provider E2E: внешний host не завершил TLS handshake из текущей среды.
- 2026-08-22: недостающий контракт реализации закрыт для project create/types/integrations и локальной идемпотентности; contract/unit/build PASS. Реальный provider POST и полный live E2E всё ещё требуют совместного безопасного запуска на тестовом проекте.
- Точка live PDF с визуальной проверкой QR, Telegram live и регистрация webhook: отсутствуют перевыпущенные credentials и публичный HTTPS URL.
- PDF/визуальная приёмка закрывающего акта: функциональность отсутствует.
- Точные результаты кейсов, зависящих от Q-001–Q-030, нельзя принять до письменных продуктовых решений.
- OWASP DAST, Safari/Firefox/Edge/Chrome matrix и WCAG contrast: требуемые инструменты/эталоны отсутствуют.

## Покрытие требований документацией

- `docs-testing.md`: 290 уникальных ID, включая 30 Q-блокеров.
- `TEST_CASES.md`: 106 кейсов: 92 AUTO, 8 MANUAL, 3 AUTO/MANUAL, 1 BLOCKED и 2 смешанных invoice/act статуса до этого прогона.
- Автоматические зелёные тесты не означают полное покрытие ТЗ: controller/UI stores/exports имеют значительные нулевые зоны coverage.

## Решение о выпуске

Выпуск запрещён до исправления как минимум DEF-001–005 и DEF-013, добавления регрессионных тестов на каждый дефект и повторного полного прогона. Для формальной приёмки дополнительно нужны browser-среда, утверждение Q-001–Q-030, live credentials/staging внешних сервисов и согласованные SLA/визуальные эталоны.
