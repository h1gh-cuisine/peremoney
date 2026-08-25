# Матрица бизнес-тестов Peremoney

Источник ожиданий: `docs-agent.md`. Тест считается правильным, если он воспроизводит требование, даже если текущий код его не проходит.

Статусы: `AUTO` — автотест; `MANUAL` — ручной/исследовательский; `BLOCKED` — нет реализации или внешней среды; `DEFECT` — автотест нашёл расхождение.

| ID | Требование/кейс | Уровень | Статус |
|---|---|---|---|
| AUTH-01 | Верный пароль выдаёт JWT без passwordHash | Backend unit | AUTO |
| AUTH-02 | Неверный/неактивный/неизвестный user получает 401 | Backend unit | AUTO |
| AUTH-03 | Master может читать/менять любой кабинет | Backend unit | AUTO |
| AUTH-04 | Full ограничен своим кабинетом | Backend unit | AUTO |
| AUTH-05 | Limited может читать, но не изменять | Backend unit/API | AUTO; fresh HTTP smoke PASS 2026-08-21 |
| AUTH-06 | Dashboard/Leads/Payer не скрываются | Frontend unit | AUTO |
| AUTH-07 | Черновик visibility не влияет до Save | Frontend store | AUTO |
| AUTH-08 | API-клиент добавляет Bearer JWT и преобразует ошибку API | Frontend unit | AUTO |
| AUTH-09 | Истёкшая/отклонённая сессия очищается при 401 | Frontend unit | AUTO |
| AUTH-10 | Роль определяет свой кабинет и разрешённые маршруты | Frontend unit | AUTO |
| AUTH-11 | Сессия сохраняется, восстанавливается и удаляется из localStorage | Frontend store | AUTO |
| CAB-01 | Создание кабинета атомарно создаёт Full/Limited | Backend unit | AUTO |
| CAB-02 | Пароли генерируются криптографически и хэшируются | Backend unit | AUTO |
| CAB-03 | Имя provider-проекта собрано по шаблону | Frontend unit | AUTO |
| CAB-04 | Повтор idempotency key не создаёт provider-дубль | Integration | BLOCKED |
| CAB-05 | Клон не вызывает provider API, сбрасывает метрики | Backend unit/API | AUTO |
| CRM-01 | Все страницы answers выгружаются | Backend unit | AUTO |
| CRM-02 | `repeat` не сохраняется | Backend unit | AUTO |
| CRM-03 | `(cabinetId, providerAnswerId)` не дублирует контакт | DB integration | MANUAL |
| CRM-04 | `success` создаёт лид, остальные статусы — нет | Backend unit | AUTO |
| CRM-05 | Пять статусов переводятся, остальные пусты | Backend+Frontend unit | AUTO |
| CRM-06 | Дата провайдера без offset считается МСК | Backend unit | AUTO |
| CRM-07 | Период включает обе границы | Backend+Frontend unit | AUTO |
| CRM-08 | Поиск лида по ID и телефону | Backend+Frontend unit | AUTO |
| CRM-09 | Feedback/status/amount редактируются, provider-поля нет | Backend unit | AUTO |
| CRM-10 | Повторный sync не перезаписывает feedback/status/amount | Backend unit | AUTO |
| CRM-11 | Записи звонка запрашиваются по providerAnswerId | Backend unit | MANUAL |
| CRM-12 | Contact/Lead API преобразует ISO-даты, nullable-поля, Decimal и Prisma enum в UI-модель | Frontend unit | AUTO |
| CRM-13 | Редактируемые поля лида преобразуются обратно в backend enum/payload | Frontend unit | AUTO |
| SRC-01 | Дефолтный период с 01.06.2026 | Backend+Frontend unit | AUTO |
| SRC-02 | Имя и оператор извлекаются из provider-тега | Backend+Frontend unit | AUTO |
| SRC-03 | Фильтр лидов/статуса комбинируется | Frontend unit | AUTO |
| SRC-04 | Включение = `true/50`, выключение = `false/0` | Backend unit | AUTO |
| SRC-05 | Продажи и доля нецелевых считаются по site | Backend unit | AUTO |
| SRC-06 | Автоочистка выключает теги ниже порога | Backend unit | AUTO |
| SRC-07 | Автоуправление включает теги на/выше порога | Backend unit | AUTO |
| SRC-08 | Domain ставит задачу +5 минут, phone — нет | Backend unit | AUTO |
| SRC-09 | Domain worker включает parsing и выключает domain-теги | Backend unit | AUTO |
| SRC-10 | Domain worker retry/recovery/concurrency | Backend unit | AUTO |
| SRC-11 | Source API преобразует Prisma Decimal, nullable-поля и расчётные метрики в UI-модель | Frontend unit | AUTO |
| SRC-12 | Применённый период передаётся backend как две календарные даты | Frontend unit | AUTO |
| SRC-13 | UI-настройка autoManage преобразуется в backend autoManagement | Frontend unit | AUTO |
| SCH-01 | Слоты 09/11/15/18/20 создаются по МСК | Backend unit | AUTO |
| SCH-02 | Пропущенные слоты за 24 часа добираются | Backend unit | AUTO |
| SCH-03 | Unique+SKIP LOCKED исключают двойной запуск | DB integration | MANUAL |
| SCH-04 | WEEKDAYS активен Вс–Чт, WEEKENDS — Пт/Сб | Backend unit | AUTO |
| SCH-05 | EVERYDAY активен каждый день | Backend unit | MANUAL |
| SCH-06 | HTML-скрипт обновляется в 20:00 | Backend unit | AUTO |
| FIN-01 | Счёт = quantity × цена текущего тарифа | Backend unit | AUTO |
| FIN-02 | Без плательщика счёт не создаётся | Backend unit | MANUAL |
| FIN-03 | Paid зачисляет деньги/единицы один раз | Backend unit+DB | AUTO/MANUAL |
| FIN-04 | Возврат Paid→Pending откатывает баланс | Backend unit | MANUAL |
| FIN-05 | Смена типа заменяет totalUnits и обнуляет usedUnits | Backend unit | AUTO |
| FIN-06 | Тот же тип добавляет единицы | Backend unit | MANUAL |
| FIN-07 | VDL списывает лид, PACKAGE/NUMBERS — контакт | Backend unit | AUTO |
| FIN-08 | Повторный CRM sync не делает повторное списание | Backend unit | AUTO |
| FIN-09 | LTV/Expected/Total payments считаются по статусам | Frontend unit | AUTO |
| FIN-10 | Акт: начало = ранний платёж, конец = сегодня | Backend unit | MANUAL |
| FIN-11 | PDF счёта Точки создаётся и скачивается с авторизацией; PDF акта пока не реализован | Integration | AUTO invoice / BLOCKED act |
| FIN-12 | Payment API преобразует Decimal, uppercase status и ISO datetime в UI-модель | Frontend unit | AUTO |
| FIN-13 | Балансы денег и единиц берутся из backend summary | Frontend unit | AUTO |
| FIN-14 | Отсутствующий payer возвращает пустую форму, сохранённые JSON-реквизиты восстанавливаются | Frontend unit | AUTO |
| FIN-15 | Счёт Точки содержит account/customer, юрлицо или ИП, услугу, количество, цену, итог и `without_nds` | Backend unit | AUTO |
| FIN-16 | Успешное создание сохраняет `documentId`, PDF выдаётся только владельцу кабинета | Backend unit/API | AUTO |
| FIN-17 | Подписанный `incomingPayment` при точном ИНН+сумма+номер счёта переводит платёж в Paid и начисляет баланс один раз | Backend unit/DB | AUTO |
| FIN-18 | Повторный `paymentId` подтверждается без повторного начисления | Backend unit/DB | AUTO |
| FIN-19 | Невалидная RS256-подпись webhook отклоняется без изменения данных | Backend unit/API | AUTO |
| FIN-20 | Недоплата, переплата, другой ИНН или неизвестный счёт сохраняются для ручного разбора без начисления | Backend unit/DB | AUTO |
| FIN-21 | Внутренние переводы игнорируются, но аудируются | Backend unit | AUTO |
| FIN-22 | Telegram получает уведомление об успешной и неопознанной оплате; ошибка Telegram не откатывает банковскую операцию | Backend unit | AUTO |
| FIN-23 | Подтверждённый банком платёж нельзя вручную вернуть в Pending или удалить | Backend unit/API | AUTO |
| DASH-01 | Contacts/Qualified/Sold/CR/Revenue/CPL/Avg/SaleCost по точным формулам | Backend+Frontend unit | AUTO |
| DASH-02 | Пустые выборки не дают NaN/Infinity | Backend+Frontend unit | AUTO |
| DASH-03 | Дневной ряд содержит все дни периода в любом timezone | Frontend unit | AUTO |
| DASH-04 | Выручка включает только «купил» | Backend+Frontend unit | AUTO |
| DASH-05 | Дневные CPL и стоимость продажи считаются из реальных списаний/продаж | Backend+Frontend unit | AUTO |
| MASTER-01 | Pending сверху, внутри статуса новые выше | Frontend unit | AUTO |
| MASTER-02 | Retention = payments / active-at-snapshot × 100 | Frontend+Backend unit | AUTO |
| MASTER-03 | Бонус = 10% суммы | Frontend+Backend unit | AUTO |
| MASTER-04 | Клиенты ранжируются по сумме за период | Frontend+Backend unit | AUTO |
| MASTER-05 | Master payment DTO преобразует Decimal/status/cabinet metadata в UI | Frontend unit | AUTO |
| MASTER-06 | Master Dashboard использует серверные retention/bonus/client ranking за период | Frontend API | AUTO |
| MASTER-07 | Список проектов содержит DB-агрегаты и логины, но не passwordHash | Backend+Frontend | AUTO |
| MASTER-08 | Новый пароль клиента хэшируется и открыто не хранится | Backend unit | AUTO |
| MASTER-09 | Price/renewal/active/hidden проекта сохраняются в backend | Backend unit/API | AUTO |
| MASTER-10 | Clone не вызывает provider, создаёт новые credentials и сбрасывает метрики | Backend unit | AUTO |
| MASTER-11 | Справочник менеджеров строится без дублей из реальных имён проектов/платежей | Frontend unit | AUTO |
| LF-01 | Backend передаёт Bearer и вызывает документированные Leads Factory paths | Backend contract | AUTO |
| LF-02 | POST project отправляет name/type/regions/status и не повторяется автоматически после 504 | Backend contract | AUTO |
| LF-03 | Повтор успешного создания с тем же idempotencyKey не вызывает второй provider POST | Backend unit/DB | AUTO |
| LF-04 | Внешний успех и локальный сбой сохраняют providerProjectId для продолжения без второго POST | Backend unit/DB | AUTO |
| LF-05 | Тип VDL/ПКТ/НОМЕРА выбирается из актуального `/projects/types` | Backend unit/provider | AUTO + live MANUAL |
| LF-06 | Telegram/Bitrix/AmoCRM/Email integrations доступны через backend proxy | Backend contract/provider | AUTO + live MANUAL |
| LF-07 | 422 detail не возвращает provider `input`; GET/PATCH ограниченно retry 502/504 | Backend contract | AUTO |
| LF-08 | Два параллельных запроса с одним idempotencyKey не выполняют два provider POST | Backend unit/concurrency | AUTO |
| LF-09 | Retry одной формы повторно использует тот же idempotencyKey и возвращает те же credentials | Backend+Frontend contract | AUTO |
| LF-10 | Локальный cabinet/users и статус SUCCEEDED фиксируются одной транзакцией | Backend unit/DB | AUTO |
| LF-11 | Integration proxy возвращает только разрешённые status-поля без token/webhook/password | Backend security | AUTO |
| LF-12 | При создании проекта backend получает отображаемое имя менеджера, а не технический ID | Frontend contract | AUTO |
| FAN-01 | Публичный lead endpoint валидирует payload/token | API/unit | AUTO |
| FAN-02 | Один external ID принимается один раз | Unit/DB integration | AUTO |
| FAN-03 | Лид доставляется во все связанные кабинеты | Unit/DB integration | AUTO |
| FAN-04 | Ошибка одной доставки не отменяет остальные, все попытки аудируются | Backend unit | AUTO |
| UI-01 | Contacts/Leads/Sources таблицы показывают точные колонки ТЗ | Component | AUTO/MANUAL |
| UI-02 | Фильтры управляют таблицами и границами | Frontend unit | AUTO |
| UI-03 | Скрипт рендерится, но не редактируется | Component/security | AUTO |
| UI-04 | CSV содержит BOM/CRLF и экранирует quotes/delimiters для Excel | Frontend unit | AUTO |
| UI-05 | Invoice modal создаёт и скачивает PDF Точки; Act modal создаёт структурированный документ | Frontend/API | AUTO invoice / MANUAL act |
| UI-06 | Cached HTML-скрипт преобразуется из cabinet API и остаётся read-only | Frontend unit | AUTO |
| UI-07 | Schedule/project type/status кабинета преобразуются между Prisma enum и UI | Frontend unit | AUTO |
| UI-08 | Schedule и visibility сохраняются только по общей кнопке Settings | Frontend/API | AUTO/MANUAL |
| UI-09 | Полная Settings-форма сохраняется одним backend update | Backend unit | AUTO |
| UI-10 | Timezone/uploads/calls/CRM/messengers восстанавливаются из кабинета | Frontend contract | AUTO |
| E2E-01 | Master login → cabinet → credentials → client login | API/browser | MANUAL (master API smoke AUTO) |
| E2E-02 | Sync → contact → success lead → edit → dashboard | API/browser | MANUAL |
| E2E-03 | Add domain → +5m worker → parsing on/tag off | API/provider | MANUAL |
| E2E-06 | Master UI create → один внешний Leads Factory project → один cabinet → два доступа | Browser/provider | MANUAL READY |
| E2E-04 | Invoice → paid → balance → usage charge → act | API/browser | AUTO (invoice/paid/balance API), browser BLOCKED |
| E2E-05 | Readiness → master login → cabinet/credentials → Settings → payer → invoice → paid balance | HTTP/PostgreSQL | AUTO |
| OPS-01 | Liveness не зависит от БД, readiness возвращает 503 при недоступной PostgreSQL | Backend unit/API | AUTO |
| OPS-02 | Login и public fan-out ограничиваются по IP и временному окну | Backend unit | AUTO |
| OPS-03 | Каждый HTTP-ответ получает безопасный request ID | Backend unit/API | AUTO |
| OPS-04 | PostgreSQL backup создаётся в custom format и читается pg_restore | Infrastructure smoke | AUTO |
| OPS-05 | OpenAPI JSON публикует спецификацию, bearer scheme и зарегистрированные API paths | HTTP smoke | AUTO |
| AUTH-12 | Скрытый FULL раздел запрещён LIMITED одновременно в UI и API | API/E2E | AUTO contacts/sources/finance; fresh HTTP smoke PASS 2026-08-21 |
| AUTH-13 | Logout инвалидирует ранее выданный JWT на сервере | API/security | AUTO |
| FIN-24 | Повтор create invoice после double-click/timeout/retry не создаёт банковский дубль | Backend/API | AUTO; live bank MANUAL |
| SRC-14 | 5000 источников доступны через пагинацию без потерь и зависания | API/UI/performance | AUTO contract; load MANUAL |
| UI-11 | Provider HTML санитизируется или изолируется от DOM приложения | Frontend/security | AUTO (sandboxed iframe) |
| FILE-01 | CSV нейтрализует `=`, `+`, `-`, `@` против formula injection | Frontend/security | AUTO |
| OPS-06 | Production dependency audit не содержит High/Critical | Security | BLOCKED registry/major upgrade |
| UI-12 | LIMITED не видит и не может изменять управление доступом/проектом в Settings | Component/browser | AUTO; browser PASS 2026-08-21 |
| UI-13 | Script не падает на ISO datetime и повреждённой/пустой дате | Component/browser | AUTO |
| UI-14 | Меню проекта и длинное имя не выходят за границы узкого viewport | Frontend component/browser | AUTO component / MANUAL browser |
| OPS-07 | Dev frontend по умолчанию обращается к QA API `localhost:4010/api` | Browser/config | AUTO |
