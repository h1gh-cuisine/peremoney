# Журнал выполненных работ

Этот файл — постоянный актуальный отчёт проекта. При каждом изменении кода нужно:

1. Обновить статус соответствующего пункта в `BACKEND_PLAN.md`.
2. Добавить запись в начало раздела «История».
3. Указать фактически выполненные проверки и известные ограничения.

## Текущее состояние

- Frontend реализован на Next.js; клиентские разделы, Dashboard и master Payments/Projects list/edit/clone подключены к backend; production mock-данные удалены, остаются внешние provider/PDF пункты.
- Backend: завершены этапы 1–4; этап 5 выполнен кроме PDF-генерации счетов и актов по Google Docs-шаблонам.
- Этап 6 завершён; этап 7 выполняется. Следующая задача — provider-aware create Project с идемпотентностью.

## История

### 2026-08-21 — Полный системный тест по docs-testing.md

- Выполнены backend/frontend unit+coverage/build, PostgreSQL integrations, отдельный RBAC/API smoke, health/readiness/OpenAPI/request-ID/rate-limit, backup/restore и dependency audit.
- Автотесты: backend 24 suites / 75 tests; frontend 24 suites / 68 tests; integration 2/2. Coverage: backend statements 45.05%, frontend 43.36%.
- RBAC/API requirements smoke: 14 PASS / 3 FAIL. Подтверждены LIMITED-write и отсутствие серверного enforcement скрытых Contacts/Finance.
- Security audit подтвердил unsanitized provider HTML, CSV formula injection и 5 backend + 3 frontend High dependency chains.
- Browser/visual testing заблокировано отсутствием browser runtime; Leads Factory read-only smoke — TLS failure; Точка live — нет перевыпущенных credentials/public HTTPS URL.
- Полный результат, 15 дефектов, блокеры и release verdict `NOT READY FOR RELEASE` записаны в `TEST_REPORT_2026-08-21.md`.

### 2026-08-21 — Счета и автоматические оплаты через Точка.API

- Google/Word-preview счёта заменён на B2B `Create Invoice` Точки: backend формирует документ с услугой, количеством, ценой, `without_nds`, сроком 5 дней и реквизитами покупателя; сохраняет `documentId` и отдаёт защищённый PDF.
- Frontend скачивает банковский PDF вместо `window.print`; форма плательщика дополнена КПП.
- Добавлен публичный `POST /api/webhooks/tochka` (`text/plain`): JWT принимается только после проверки RS256 публичным ключом Точки.
- `incomingPayment` начисляется только при точном совпадении ИНН, RUB-суммы и номера счёта в назначении. Unmatched/internal события аудируются без изменения баланса.
- `paymentId` уникален; webhook audit, Paid, balance entry и кабинет обновляются одной PostgreSQL-транзакцией. Повтор подтверждается без повторного начисления.
- Банковский платёж нельзя вручную вернуть в Pending или удалить. Telegram отправляется после commit, его отказ не откатывает оплату.
- Добавлена миграция №10: банковские идентификаторы платежа/документа и `TochkaWebhookEvent`; миграция применена, schema up to date.
- Секреты вынесены в env, старый реальный `LEADS_FACTORY_TOKEN` удалён из `.env.example`; опубликованные в чате банковский JWT и bot token в workspace не сохранялись.
- Проверки: backend — 24 suites / 75 tests и Nest build; frontend — 24 suites / 68 tests и Next production build; PostgreSQL integration — 2 suites / 2 tests, включая настоящий HTTP `text/plain` webhook с тестовой RS256-подписью.
- Live-остаток: заполнить новый `TOCHKA_JWT`, `TOCHKA_CUSTOMER_CODE`, `TOCHKA_ACCOUNT_ID`, перевыпущенный `TELEGRAM_BOT_TOKEN`; после появления HTTPS-домена задать `TOCHKA_WEBHOOK_URL` и зарегистрировать его в Точке.

### 2026-08-21 — Автономный hardening/E2E/cleanup проход завершён

- Добавлен HTTP/PostgreSQL integration: readiness, master login, JWT, кабинет/credentials, Settings, payer, invoice, Paid и проверка money/unit balance; данные очищаются.
- Integration regression: 2 suites / 2 tests, включая fan-out; backup archive проверен `pg_restore --list` и восстановлен в отдельную временную БД (16 public tables), после проверки временная БД удалена.
- `SubmissionLock` подключён к Payer, Settings, Sources add, Invoice, Closing Act и Clone; повторный submit отбрасывается, кнопки показывают pending.
- Удалены все production mock/константные файлы. Справочник менеджеров строится без дублей из имён в реально загруженных проектах/платежах; отдельный persistent manager CRUD в backend пока не реализован.
- Sources tag types загружаются через backend/provider endpoint; статический список удалён.
- CSV покрыт BOM/semicolon/CRLF/quote escaping тестом.
- Coverage audit: backend statements 40.25%; frontend statements 41.65%, lines 48.01%. Нулевые зоны преимущественно controllers/DTO/React hooks; критические middleware и контракты дополнительно покрыты.
- Добавлен frontend-кейс уникального стабильного справочника менеджеров из реальных project manager names.
- Финальная регрессия после cleanup: backend — 19 suites / 58 tests и Nest build; frontend — 24 suites / 67 tests и Next production build; PostgreSQL integration — 2 suites / 2 tests.
- Живой OpenAPI smoke успешен: `/api/docs-json` вернул OpenAPI 3.0.0, bearer security scheme и 38 paths; временный API после проверки остановлен.
- Внешний остаток: provider-aware создание проекта/реальный provider smoke требуют `LEADS_FACTORY_TOKEN`, PDF по Google Docs-шаблонам требует Google credentials; persistent CRUD сотрудников остаётся отдельной backend-задачей.

### 2026-08-20 — Этап 7: readiness, rate limiting, request logs и backup

- Test-first добавлен `/health/ready`: выполняет `SELECT 1`, liveness остаётся независимым, сбой БД преобразуется в 503.
- In-memory fixed-window rate limiter защищает login и public fan-out; лимиты/окно настраиваются env.
- Каждый запрос получает/сохраняет безопасный `X-Request-Id`; access-log пишется одной JSON-строкой без body/token/credentials.
- Добавлены безопасные backup/restore scripts: абсолютный путь, запрет overwrite и явный `CONFIRM_RESTORE=peremoney`.
- Реальный backup smoke PostgreSQL 17 успешен: custom archive содержит 113 TOC entries и читается `pg_restore --list`.
- Backend после hardening: 17 suites / 56 tests и Nest build успешны.

### 2026-08-20 — Клиентский Dashboard полностью переведён на backend

- Красный backend-кейс выявил отсутствие дневных `sold/saleCost`; агрегация расширена формулой `spent / bought`, с нулём без продаж.
- Добавлен frontend-контракт преобразования `/cabinets/{id}/dashboard` в карточки и оба графика.
- Удалено рабочее использование `mockDashboard`: Contacts/Leads, CPL и стоимость продажи теперь приходят из реальных DB-агрегатов за период.
- Проверки: backend — 14 suites / 51 tests и build; frontend — 21 suites / 62 tests и production build.

### 2026-08-20 — Master Project clone подключён

- Добавлен master-only `POST /cabinets/{id}/clone`: копия создаётся внутренней транзакцией без вызова Leads Factory.
- Клон наследует provider project link и sphere, но получает новые name/type/price/manager, нулевые бизнес-метрики и новые FULL/LIMITED credentials.
- Пароли хэшируются; открытые значения выдаются только в ответе создания клона и передаются frontend-модалке.
- Добавлен backend regression-тест отсутствия копирования балансов/метрик и создания двух новых пользователей.
- Полная проверка перед тестом clone: backend 49/49 и build, frontend 61/61 и production build; отдельный clone suite зелёный, итог backend — 50 тестов.

### 2026-08-20 — Этап 7: master Projects, список и редактирование

- Test-first backend-кейс закрепил сохранение price/renewal/active/hidden и bcrypt-хэширование нового client password.
- Cabinet расширен `renewalStatus` и `hidden`; добавлен master-only `PATCH /cabinets/{id}/master-project`.
- `GET /cabinets` возвращает контакты/лиды/продажи, LTV, оплаты, средний чек и логины FULL/LIMITED; passwordHash не выбирается и открытые пароли не возвращаются.
- Frontend Projects загружает реальные кабинеты и сохраняет редактирование строки через backend; отсутствующие открытые пароли показываются пустыми.
- Девятая миграция `master_projects` применена; PostgreSQL schema up to date.
- Проверки: backend — 14 suites / 49 tests и build; frontend — 20 suites / 61 tests и production build.
- Ограничение: create/clone всё ещё требуют отдельной реализации; create должен вызывать Leads Factory с idempotency-защитой, clone — создавать внутреннюю копию без provider API.

### 2026-08-20 — Этап 7: master Payments и Dashboard

- Сначала добавлены красные frontend-контракты Payment DTO и серверной master-аналитики.
- Master Payments загружает `/master/payments`; Decimal/status/cabinet metadata преобразуются в таблицу.
- Оплата/возврат в ожидание и удаление выполняются через backend с оптимистичным UI и откатом при ошибке.
- Master Dashboard запрашивает `/master/dashboard` за выбранный период и показывает рассчитанные backend retention, бонусы и рейтинг клиентов вместо расчёта по mock-сторам.
- Проверки: frontend — 19 suites / 60 tests, TypeScript и production build успешны.
- Следующее ограничение: master Projects пока mock; backend нужно расширить ручным renewal status/hidden и безопасным управлением credentials.

### 2026-08-20 — Расширенные Settings: backend и frontend

- Работа выполнена test-first: красный backend-кейс потребовал единого `updateSettings`, затем добавлены модель, DTO, API и frontend-интеграция.
- Cabinet хранит timezone, uploads/calls flags, CRM и массив messenger integrations; status, schedule и visibility сохраняются той же атомарной командой.
- Добавлен защищённый `PATCH /cabinets/{id}/settings` для `MASTER/FULL` с проверкой принадлежности кабинета и валидацией значений.
- Settings загружает все сохранённые поля из `/cabinets/me`; общая кнопка больше не оставляет часть формы только в памяти.
- Добавлена и применена восьмая миграция `cabinet_settings`; `prisma migrate status` подтвердил актуальность схемы PostgreSQL.
- Проверки: backend — 14 suites / 48 tests и Nest build; frontend — 18 suites / 58 tests и production build.

### 2026-08-20 — Этап 7: Script и поддерживаемая часть Settings

- Сначала добавлены красные тесты преобразования cached operator script, schedule, project status/type и visibility payload.
- Script читает сохранённый backend HTML из `/cabinets/me`, показывает loading/error и не предоставляет редактирование.
- Settings загружает реальные status/type/schedule; тип `NUMBERS` теперь действительно блокирует переключатель обзвона вместо frontend-константы.
- Общая кнопка сохраняет schedule и visibility через backend; локальный visibility применяется только после успешных запросов.
- Проверки: frontend — 18 suites / 58 tests, TypeScript и production build успешны.
- Ограничение: timezone, uploads, calls, CRM и messenger integrations пока не имеют полей/API в backend и требуют отдельного серверного среза; живой script sync зависит от Leads Factory token.

### 2026-08-20 — Этап 7: Finance и Payer подключены к API

- Работа выполнена test-first: добавлены красные контракты Payment/summary/payer JSON, затем реализованы API-адаптеры.
- Finance загружает платежи и серверные балансы денег/единиц; Prisma Decimal, статусы и даты преобразуются в UI-модель.
- Счёт создаётся через `/finance/invoices`: количество отправляется backend, цена и итог берутся только из созданного сервером платежа, frontend mock-цена удалена из расчёта.
- Акт создаётся через `/finance/closing-acts` с массивом выбранных payment ID.
- Payer загружается и сохраняется через `/payer`; неполный JSON безопасно дополняется пустыми полями формы.
- Проверки: frontend — 16 suites / 54 tests, TypeScript и production build успешны.
- Ограничение: Google Docs PDF ещё не подключён; UI печатает временный preview после успешного создания серверного документа.

### 2026-08-20 — Этап 7: Sources подключены к API

- Работа выполнена test-first: сначала добавлены красные кейсы преобразования Source DTO, периода и настроек автоматизации.
- Список источников загружается из `/cabinets/{id}/sources`; Decimal и nullable-поля преобразуются в UI-модель, фильтры по лидам/статусу остаются локальными.
- Переключение источника выполняет оптимистичный `PATCH` с откатом при ошибке.
- Массовое добавление отправляет реальные строки, тип источника и выбранный тип тега в backend вместо создания фиктивных строк.
- Настройки автоочистки и автоуправления сохраняются через backend с преобразованием `autoManageEnabled` → `autoManagementEnabled`.
- Проверки: frontend — 14 suites / 51 tests, TypeScript и production build успешны.
- Ограничение: живой Leads Factory smoke не выполнялся — токен провайдера не настроен; текущий backend API-контракт проверен unit-тестами и сборкой.

### 2026-08-20 — Этап 7: Contacts и Leads подключены к API

- Сначала добавлены красные тесты контрактов Contacts/Leads, затем реализованы преобразователи backend DTO в UI-модели.
- Contacts загружаются из `/cabinets/{id}/contacts`; локальные фильтры по дате и пяти разрешённым статусам сохранены согласно ТЗ.
- Leads загружаются из `/cabinets/{id}/leads`; Prisma enum и Decimal преобразуются в UI-статус и число, nullable provider-поля безопасно отображаются пустыми.
- Feedback, статус и сумма обновляются через `PATCH`; применено оптимистичное обновление с откатом и сообщением при ошибке.
- Записи звонков лениво загружаются через `/calls` по нажатию, без пачки provider-запросов при открытии таблицы.
- Клиентский Dashboard теперь получает реальные Contacts/Leads из тех же API-хранилищ вместо старых mock-наборов.
- Проверки: frontend — 13 suites / 48 tests, production build и TypeScript-проверка успешны.
- Ограничение: дневной ряд CPL/стоимости продажи и финансовые данные Dashboard пока остаются mock; browser E2E недоступен в текущей сессии.

### 2026-08-20 — Этап 7: auth и bootstrap кабинета

- Работа выполнена test-first: добавлены frontend-кейсы API-клиента, role routing и персистентной сессии, затем реализован код.
- Добавлены типизированный API-клиент с Bearer JWT/едиными ошибками/обработкой 401, Zustand-сессия с восстановлением из localStorage и role-aware маршрутизация.
- Реализованы страница входа, защита клиентских и мастер-маршрутов, выход из системы и загрузка серверной visibility через `/cabinets/me`.
- Удалены взаимные ссылки между master/client sidebar, которые позволяли переходить в чужой контур интерфейса.
- Реальный API smoke: `/health` — 200, master login — 201, `/auth/me` с выданным JWT — 200 и роль `MASTER`.
- Проверки: frontend — 11 suites / 44 tests и production build; backend — 14 suites / 47 tests и Nest build.
- Ограничение: бизнес-страницы всё ещё читают mock-хранилища; browser E2E не выполнен, потому что в текущей сессии нет доступного браузера.

### 2026-08-20 — Этап 6: PostgreSQL integration завершён

- Добавлен постоянный `test:integration` с отдельным Jest-конфигом для реальной PostgreSQL.
- Седьмая миграция `fanout` применена; `prisma migrate status` подтвердил актуальность всех 7 миграций.
- Integration-кейс на реальной БД подтвердил: many-to-many на 2 кабинета, создание двух Contact/Lead и отсутствие дублей при повторе `externalId`.
- Временные integration-данные удалены в `afterAll`; backend build и 14 suites / 47 unit-тестов после миграции проходят.

### 2026-08-20 — Этап 6: fan-out (код и unit-проверки)

- Работа выполнена test-first: снача добавлены красные кейсы many-to-many, токена, идемпотентности и изоляции ошибок доставки, затем реализован код.
- Добавлены `FanoutSource`, many-to-many `FanoutDestination`, идемпотентный `IncomingLead` и аудит `FanoutDelivery` со статусом, attempts, error и созданным contact ID.
- Мастер создаёт источник, получает одноразово показанный токен, настраивает кабинеты и читает журн доставок; в БД хранится только bcrypt-хэш токена.
- Публичный `POST /api/fanout/{publicId}/leads` принимает `externalId`, дату, телефон и опциональные provider-поля, авторизуется `X-Fanout-Token`.
- Для каждого кабинета создаются реальные Contact/Lead, идемпотентно списывается нужный тариф; сбой одной доставки не отменяет остальные.
- Проверки: Prisma schema — валидна; backend build — успешно; backend Jest — 14 suites / 47 tests; frontend Jest — 8 suites / 35 tests; frontend production build — успешно.
- Ограничение: седьмая миграция не применена и PostgreSQL smoke не выполнен, потому что Docker Desktop вручную поставлен на паузу.

### 2026-08-20 — Test-first workflow и исправление timezone/SWC

- Закреплён порядок работы: бизнес-требование → красный тест → минимальный код → зелёный регресс → рефакторинг.
- Исправлен timezone-дефек `enumerateDates`: календарные ISO-даты теперь перебираются UTC-арифметикой и не сдвигаются в UTC+4.
- Красный кейс `DASH-03` стал зелёным; frontend — 8 suites / 35 tests, backend — 13 suites / 42 tests.
- Восстановлен отсутствовавший SWC-бинарник `@next/swc-darwin-arm64@15.5.23`; production build Next.js снова успешен.
- Добавлен `outputFileTracingRoot`, чтобы Next.js не выирал ложный workspace root из-за внешнего lockfile.
- Браузерный smoke не выполнен: в текущей сессии нет доступного in-app/extension browser; `next dev` при этом успешно запускается.

### 2026-08-20 — Тестовая матрица по бизнес-ТЗ (первый проход)

- Создан `TEST_CASES.md`: требования декомпозированы на атоматизированные, ручные, заблокированные и выявившие дефект кейсы.
- Backend расширен тестами auth/RBAC, поиска и редактирования CRM, расчётов/управления источниками. Результат: 13 suites / 42 tests, все успешны; statements coverage 40.93% по всем `src`, включая controllers/DTO/bootstrap.
- Для frontend добавлен Jest-runner без новых runtime-зависимостей, unit-тесты статусов, фильтров, формул, доступа, финансов, мастер-аналитики и SSR-контракты таблиц/скрипта.
- Frontend: 35 тестов; 34 проходят, 1 намеренно оставлен красным как дефек: дневной ряд дашборда сдвигается на день в timezone UTC+4. Statements coverage в первом проходе — 38.63% по всей frontend-бизнес-логике.
- Попытка добавить jsdom/Testing Library дважды завершилась `ECONNRESET`; компонентные кейсы пока выполняются SSR-рендером, интерактивные и E2E отмечены в матрице.

### 2026-08-20 — Этап 5: финансовое ядро и аналитика

- Добавлены плательщик с гибкими реквизитами, счета/платежи со снимком тарифа и журнал движений баланса.
- Оплата зачисляет деньги и единицы; возврат в `PENDING` откатывает зачисление. При смене типа тарифа лимит заменяется, а счётчик использования обнуляется.
- Списания за контакты (`PACKAGE`/`NUMBERS`) и лиды (`VDL`) идемпотентны: повторная CRM-синхронизация не списывает баланс второй раз.
- Реализованы API списка/статуса/удаления платежей, анкеты плательщика, создания счёта, данных акта, сводки финансов и редактирования тарифа.
- Клиентский дашборд считает контакты, квалы, продажи, CR, выручку, CPL, средний чек и стоимость продажи; возвращаются также дневные ряды.
- Мастер-дашборд возвращает retention/бонусы по менеджерам и ранжирование клиентов по сумме оплат.
- Шестая миграция применена к PostgreSQL 17; Nest build — успешно; Jest — 9 suites / 26 tests; Prisma schema — валидна.
- Ограничение: API пока возвращает структурированные данные счёта/акта; для выдачи PDF нужны сервисные credentials и доступ к Google Docs-шаблонам.

### 2026-08-19 — Этап 4: надёжный планировщик

- Добавлены персистентные запуски `ScheduledRun` для каждого активного кабинета: теги в 09:00, контакты в 11:00 и 15:00, автоматизация в 18:00, расписание и HTML-скрипт в 20:00 МСК.
- После перезапуска worker добирает пропущенные слоты за последние 24 часа; unique-ключ и `FOR UPDATE SKIP LOCKED` защищают от дублей и параллельного выполнения.
- Для ошибок реализованы до 3 попыток с exponential backoff, восстановление зависших запусков и журн последних 100 запусков через API.
- Добавлены режимы `WEEKDAYS`, `WEEKENDS`, `EVERYDAY`, API их настройки, применение статусов проекта и хранение свежего HTML-скрипта оператора.
- Пятая миграция применена к PostgreSQL 17; `prisma migrate status` — схема актуальна.
- Проверки: Prisma schema — валидна; Nest build — успешно; Jest — 8 suites / 22 tests.

### 2026-08-17 — Этап 3: отложенная обработка доменов

- Добавлена персистентная PostgreSQL-очередь `DomainSourceJob`: задача создаётся после добавления доменов и становится доступна через 5 минут.
- Worker атомарно забирает задачи через `FOR UPDATE SKIP LOCKED`, восстанавливает зависшие запуски и делает до 3 попыток с exponential backoff.
- Реализована полная цепочка ТЗ: получение всех domain-источников, `parse_phone=false`/`parse_ishod=true`, получение domain-тегов и их выключение (`norm_work=false`, `limit=0`).
- Добавлены миграция, переменная `DOMAIN_JOB_POLL_MS` и модульные тесты успешного запуска, retry и отложенного старта.
- Проверки: Prisma schema — валидна; Nest build — успешно; Jest — 7 suites / 18 tests.
- Ограничение: миграция не применялась к локальной PostgreSQL в этом запуске: Docker daemon выключен.

### 2026-08-16 — Этап 3: источники (основная часть)

- Добавлены модель `SourceTag`, настройки автоочистки/автоуправления кабинета и третья PostgreSQL-миграция.
- Реализованы VDL-методы: получение тегов за период, массовое добавление источников, точечное и пакетное управление тегами, справочник типов.
- Реализован явный запуск фильтрации/синхронизации, дефолтная дата 01.06.2026, локальные фильтры и расчёт продаж/доли нецелевых.
- Имена вида `B111_74951270967_20168` очищаются; префиксы операторов переводятся по ТЗ.
- Реализованы включение (`norm_work=true`, `limit=50`) и выключение (`false`, `0`).
- Реализованы настройки и ручной запуск автоочистки/автоуправления с пакетными provider-запросами.
- Проверки: Prisma schema — валидна; третья миграция применена к PostgreSQL 17; Nest build — успешно; Jest — 6 suites / 15 tests.
- Осталось в этапе 3: персистентная отложенная обработка доменов через очередь; она будет выполнена перед cron-планировщиком, чтобы задача не терялась при перезапуске процесса.

### 2026-08-16 — Этап 2: CRM, контакты и лиды

- Добавлены PostgreSQL-модели `Contact`, `Lead`, `AnswerSyncRun` и миграция.
- Дедупликация обеспечена уникальным ключом `(cabinetId, providerAnswerId)`; `repeat` не сохраняется.
- Реализован HTTP-клиент Leads Factory: Bearer-токен только из env, таймаут 20 секунд, нормализация ошибок 401/403/404/409/422/502/504.
- Реализована полная пагинационная синхронизация `/answers` по 200 записей и журналирование результата/ошибки.
- Статус `success` создаёт/обновляет лид, не перезаписывая клиентские feedback/status/amount.
- Даты провайдера без offset интерпретируются как МСК; пять разрешённых статусов переводятся на русский, остальные получают пустую подпись.
- Добавлены защищённые API списков контактов/лидов, фильтры, поиск, редактирование лида и получение записей звонков.
- Dev PostgreSQL изолирован на порту 5433, поскольку локальный 5432 уже занят.
- Проверки: 2 реальные миграции применены к PostgreSQL 17; Prisma status — актуален; Nest build — успешно; Jest — 5 suites / 13 tests; HTTP smoke — health 200, login 201, cabinet create 201, list 200.
- Локальный Nest smoke-процесс остановлен; PostgreSQL dev-контейнер оставлен запущенным для следующего этапа.

### 2026-08-16 — Старт backend-разработки

- Изучены `docs.md` и `docs-agent.md`.
- Требования разложены на семь последовательных этапов в `BACKEND_PLAN.md`.
- После обратной связи стек окончательно выбран как NestJS + PostgreSQL + Prisma.
- Добавлены Docker Compose, Prisma-схема и начальная SQL-миграция.
- Реализованы health endpoint, JWT-аутентификация и bootstrap мастер-пользователя.
- Реализованы кабинеты и транзакционное создание учётных записей `FULL`/`LIMITED` с bcrypt-хэшами.
- Реализованы серверные RBAC-проверки и управление видимостью; Dashboard и Leads нельзя скрыть от клиента.
- Добавлены Swagger и инструкция локального запуска.
- Проверки: Prisma schema validation — успешно; Prisma Client generation — успешно; Nest build — успешно; Jest — успешно.
- Ограничения: PostgreSQL-контейнер и HTTP e2e не запускались в текущем окружении; интеграция Leads Factory и cron относятся к следующим этапам.
### 2026-08-21 — Повторный browser/RBAC-прогон

- Встроенный Browser (`iab`) стал доступен; выполнены MASTER/LIMITED login, navigation, dashboard, projects, leads, script, payer/settings smoke.
- Test-first исправлен crash Script на ISO datetime: новый regression-test сначала воспроизвёл `RangeError`, затем парсинг даты исправлен; browser retest PASS.
- Provider HTML изолирован в sandboxed iframe; regression component test PASS.
- Dev fallback frontend API исправлен с `localhost:4000/api` на фактический QA `localhost:4010/api`.
- RBAC: update lead для LIMITED переведён в write-check; добавлена server-side visibility-проверка Contacts/Sources/Finance и unit-test. Backend build и целевой suite 5/5 PASS.
- Test-first закрыт UI-RBAC Settings: LIMITED видит только read-only сообщение без save, form controls и «Управление доступом»; FULL сохраняет полную форму.
- Проверки Settings-fix: целевой regression 2/2, весь frontend 25 suites / 71 tests, production build PASS; `iab` `/settings` LIMITED PASS (нотис 1, save 0, access block 0, project inputs 0, console errors 0).
- Полный повторный прогон: backend 25 suites / 77 tests + build PASS; frontend 25 suites / 71 tests + build PASS.
- Requirements smoke на свежем backend сначала выявил перепутанный write-флаг GET/PATCH Leads (16/17). Добавлен `crm.controller.spec.ts`, флаг исправлен; повторный smoke 17/17 PASS.
- После восстановления `iab` дополнительный browser regression завершён на изолированном frontend `localhost:3011`: LIMITED Settings read-only без save/полей/access block, FULL Settings с полной формой и управлением доступом, LIMITED Leads открывается; в чистой вкладке console errors 0. Старый процесс `3010` не прерывался.

### 2026-08-22 — Завершение backend-интеграции Leads Factory

- Master «Создать проект» переведён с локального Zustand-мока на реальный `POST /api/cabinets`, который создаёт проект Leads Factory и только затем внутренний кабинет/пользователей.
- Добавлены provider methods: `POST projects`, `GET projects/types`, Telegram/Bitrix/AmoCRM/Email integrations.
- Имя внешнего проекта формируется по ТЗ: `{Регион}/Peremoney ЛКП {Тип}/{Сфера}/{Клиент}`; provider type выбирается из актуального справочника.
- Добавлена миграция `ProviderProjectCreation`: idempotencyKey, request hash, статусы PENDING/EXTERNAL_CREATED/SUCCEEDED/UNCERTAIN/FAILED и восстановление после локального сбоя без второго provider POST.
- Неидемпотентный POST не retry после 504/network uncertainty; GET/PATCH имеют до трёх ограниченных попыток с backoff.
- Provider 422 очищается от поля `input`; токен остаётся только в backend env.
- Backend: 26 suites / 84 tests PASS, build PASS. Frontend: 26 suites / 73 tests PASS, build PASS. Prisma: 11 миграций, schema up to date.
- Live provider E2E оставлен для совместного ручного прогона с владельцем тестового токена/проекта; реальные POST до подтверждения не выполнялись.

### 2026-08-22 — Исправления по Bugbot/Security review Leads Factory

- Frontend переиспользует один idempotency key и одни логины на retry заполненной формы; повторный submit защищён синхронным lock. После изменения данных ошибочной попытки создаётся новый ключ.
- Backend атомарно владеет операцией создания: конкурентный запрос с тем же ключом не доходит до provider POST; безопасные `FAILED` операции могут быть повторены.
- Создание cabinet/users и перевод provider-операции в `SUCCEEDED` объединены в одну Prisma-транзакцию. Credentials детерминированы HMAC от ключа, поэтому успешный replay возвращает исходные доступы без хранения plaintext.
- Ответ integration proxy ограничен безопасными status-полями; token, webhook URL, password и произвольный provider payload наружу не возвращаются.
- В Leads Factory передаётся отображаемое имя менеджера, а не технический `MGR-*` ID.
- Исправлен clamp меню проекта на узком viewport; добавлен regression-test.
- Финальный полный прогон: backend 26 suites / 88 tests PASS и build PASS; frontend 26 suites / 75 tests PASS и build PASS.

### 2026-08-22 — Общесистемные исправления

- Logout стал серверным: JWT содержит `sessionVersion`, `POST /auth/logout` атомарно увеличивает версию, а guard отклоняет все ранее выданные токены. Добавлена миграция и regression-тест старого JWT.
- CSV нейтрализует формулы с `=`, `+`, `-`, `@`, включая ведущие пробелы; добавлены пять security-кейсов.
- Создание счёта Точки получило обязательный UUID idempotency key, request hash и состояния `PENDING/SUCCEEDED/UNCERTAIN`. Повтор успешной операции возвращает прежний payment без второго POST; параллельная/неопределённая операция блокируется.
- Sources API получил page/pageSize (max 200), metadata total/hasMore; frontend забирает страницы последовательно. Сопоставление лидов с 5000 источниками заменено с квадратичного фильтра на Map.
- Миграции `user_session_version` и `invoice_idempotency` применены; всего 13 миграций, schema up to date.
- Полный regression после изменений: backend 27 suites / 92 tests PASS и build PASS; frontend 26 suites / 80 tests PASS и build PASS.
- Dependency audit: безопасное обновление `@nestjs/swagger` применено. Осталось backend 4 High-записи одной цепочки Prisma/deepmerge (audit не предлагает fix) и frontend 3 High в Next/postcss/sharp. Исправление frontend требует Next 16; повторные загрузки из npm registry завершились `ECONNRESET`.
- PDF закрывающего акта остаётся незакрытым: установка PDFKit также заблокирована повторным `ECONNRESET`; текущий UI формирует печатный документ через системный print.

### 2026-08-23 — Leads Factory region 422

- Live-ответ провайдера подтвердил `int_parsing` в `body.regions[0]`: frontend/backend отправляли название региона строкой вместо integer ID.
- Контракт разделён на `region` (название для имени проекта) и `regionId` (число для provider payload); `regions` теперь типизирован как `number[]`.
- UI передаёт числовые ID для РФ/Москвы/Санкт-Петербурга/Свердловской области/Краснодарского края; backend валидирует `regionId >= 1`.
- Безопасные детали provider 422 возвращаются без поля `input`, чтобы диагностировать контракт без утечки пользовательских данных.
- Полный regression: backend 27 suites / 92 tests PASS; frontend 26 suites / 80 tests PASS; обе production-сборки PASS.

### 2026-08-23 — Next manifest и Sources response envelope

- Устранена коллизия Next dev/build: production использует `.next`, dev — отдельный `.next-dev`; каталог добавлен в `.gitignore` и TypeScript include.
- Повреждённый dev-процесс на 3001 остановлен, чистый frontend запущен на 3010. `/` штатно отвечает 307 на `/login`, `/login` отвечает 200 без React Client Manifest ошибок.
- Ответ тегов Leads Factory нормализуется из массива, `{items}`, `{results}`, `{data: []}` и `{data: {items}}`; вместо `result.items is not iterable` неизвестная схема теперь даёт диагностируемую provider-ошибку.
- Целевые backend tests 15/15 PASS, Nest build PASS, Next production build PASS.

### 2026-08-23 — Leads Factory read-only contract audit

- Provider 422 подтвердил допустимые `source_from`: `ishod`, `parsed`, `web`. Добавление источников из Peremoney исправлено с недопустимого `peremoney` на `web`, regression-test проверяет точный provider payload.
- Добавлен `server/scripts/provider-readonly-smoke.mjs`: только GET, выводит HTTP status и форму JSON без значений integration fields, токена и webhook URL.
- Из среды агента read-only smoke остановлен после `project-types` и `answers`: пять попыток каждого завершились сетевым `fetch failed`; мутаций провайдера не выполнялось.
- Проверки: Leads Factory/Sources 15/15 tests PASS, Nest build PASS; frontend 26 suites / 80 tests PASS, Next build PASS.
### 2026-08-26 — Дополнительный regression backlog

- В `TEST_CASES.md` добавлены кейсы независимых MASTER/проектной сессий, постоянного переключателя кабинетов, автоматического входа в только что созданный проект и отсутствия утечки прав при смене роли.
- Добавлены проверки сохранения FULL-настроек видимости и фактического ограничения LIMITED одновременно в меню, прямых маршрутах и API.
- Добавлены сценарии поиска/множественного выбора регионов, «Вся Россия» с полным массивом provider ID и безопасного подтверждаемого изменения статуса платежа.
- В `docs-testing.md` описаны подробные E2E-011–E2E-015; browser regression checklist в `docs/09-testing.md` расширен соответствующими пунктами.
