Техническое задание

1. Цели:

Суть = личный кабинет для сервиса лидогенерации

Функции:

1. Передача лидов
2. Загрузка источников и управление источниками
3. Подсчет баланса
4. Дашборд с аналитикой
5. Передача лидов дальше по API куда угодно

Задачи:

1. Реализовать такой ЛК как по ссылке и связать его по API с настоящим ЛК нашего поставщика
2. Сделать отдельный мастер-кабинет который может создавать другие кабинеты (тупо новый логин-пароль и внутренний ID) с разным уровнем доступа (для клиентов и для моих работяг)
3. Систему которая будет распределять лиды полученные по API (отдельному) из 1 проекта в несколько разных кабинетов (чтобы допустим мы 1 лид могли продавать в несколько рук) - тупо разветвление из 1 проекта в 3-4 кабинета которые мы в мастер-кабинете с ним свяжем вручную

Вводные:

Токен: 60286a84-65eb-42ae-b0ee-4b33aecd6c3f

Ссылка: https://openapi.leads-factory.ru/v1/

Доступ в кабинет для тестирования:

1. Кабинет ЛК:
   https://lk.leads-factory.ru
   sushkevichnikolay
   !Sushkevichnikolay!1

2. Кабинет источников:
   http://vdl.leads-factory.ru
   sushkevichnikolay
   !Sushkevichnikolay!1

3. Дизайн:
   Только темная тема
   Фон = #131313
   Акцентный цвет = #831cca
   Второй акцентный цвет = #af84cc
   Запасной цвет (альтернативный) = #a7fa0a

Доступы:

Два типа доступа:
Полный = для сотрудников, видно всё + могут скрывать разделы для клиентов (ограниченного типа доступа)
Ограниченный = для клиентов, скрыты только те разделы, которые сотрудник отметил в ЛК (опция скрытия работает на разделах “Контакты”, “Источники”, “Скрипт”, “Финансы” и “Настройки”. Лиды и Дашборд скрыть нельзя.)

3. Подробное описание API методов и функционала:

Дашборд

Простой подсчет по формулам на основе данных за период:
Получено контактов = тупо количество из раздела Контакты
Квалифицировано лидов = тупо количество из раздела Лиды
Продано = количество лидов со статусом “купил” в разделе Лиды
CR в продажу = “продано” делить на “квалифицировано лидов” и умножить на 100
Выручка = сумма всех сделок со статусом “Купил” в разделе Лиды
Прибыль заменяем на “CPL” = весь потраченный баланс делим на “квалифицировано лидов”
Средний чек = “Выручка” делим на “Продано”
ROI заменяем на “Стоимость продажи” = “CPL” делим на “CR в продажу”

Диаграммы:
Столбчатая диаграмма выгрузки контактов и лиды по дням (один столбец на лиды и контакты - лиды = малая раскрашенная часть столбца контактов)
Столбчатая диаграмма с CPL и Стоимостью продажи
Остальные диаграммы не нужны

Фильтры:

1. Фильтр по дате (выбор периода через календарь)

Контакты

Как работает:

1. Система делает 2 запроса каждый день ровно в 11:00 по Мск и в 15:00 по Мск и фильтрует все контакты по дате с момента создания кабинета до настоящего времени (момент сейчас)
2. При добавлении контактов система убирает контакты со статусом “repeat” (дубли)
3. Записываем только значения “date” (дата), “status” (статус), “mobile_tel”(номер телефона), “site” (источник) “mobile_operator” (оператор связи)
4. Есть нюанс при показе статуса - мы показываем и ОБЯЗАТЕЛЬНО ПЕРЕВОДИМ НА РУССКИЙ только следующие статусы:

- new = НОВЫЙ
- noAnswerFinal = НЕДОЗВОН
- recall = ПЕРЕЗВОНИТЬ
- notRelevant = НЕ КВАЛ
- success = КВАЛ
  Все остальные статусы мы просто не показываем в ЛК (пустое место)

Фильтры:

1. По дате (внутренняя фильтрация без доп. запросов по API)
2. По статусу (только по 5 разрешенным статусам указанным в пункте 4)

API метод:

GET/v1/crm/open-api/projects/{project_id}/answers
Список заявок проекта
Parameters
Try it out
Name
Description
project_id \*
integer
(path)

date_from
string | (string | null)($date-time)
(query)
Фильтр с этого момента включительно (Answer.date >= date_from). Формат YYYY-MM-DD HH:MM:SS; можно передать и просто YYYY-MM-DD (= 00:00:00).
date_to
string | (string | null)($date-time)
(query)
Фильтр по этот момент включительно (Answer.date <= date_to). Формат YYYY-MM-DD HH:MM:SS; можно передать и просто YYYY-MM-DD (= 00:00:00).
date_updated_from
string | (string | null)($date-time)
(query)
Фильтр с этого момента включительно (Answer.date_updated >= date_updated_from). Формат YYYY-MM-DD HH:MM:SS; можно передать и просто YYYY-MM-DD (= 00:00:00).
date_updated_to
string | (string | null)($date-time)
(query)
Фильтр по этот момент включительно (Answer.date_updated <= date_updated_to). Формат YYYY-MM-DD HH:MM:SS; можно передать и просто YYYY-MM-DD (= 00:00:00).
status
array<string> | (array<string> | null)
(query)
Available values : client_blacklist, experiment, experiment2, experiment3, experiment4, experiment5, experimentFinal, experimentNotRelevant, experiment_penalty1, experiment_penalty2, experiment_penalty3, experiment_penalty4, experiment_penalty5, experiment_penaltyFinal, incorrect, late_experiment1, late_experiment2, late_experiment3, late_experiment4, late_experiment5, late_experimentFinal, late_experimentNotRelevant, new, noAnswer1, noAnswer2, noAnswer3, noAnswer4, noAnswer5, noAnswer6, noAnswer7, noAnswerFinal, notRelevant, pre-success, recall, repeat, success, undistrib
--client_blacklistexperimentexperiment2experiment3experiment4experiment5experimentFinalexperimentNotRelevantexperiment_penalty1experiment_penalty2experiment_penalty3experiment_penalty4experiment_penalty5experiment_penaltyFinalincorrectlate_experiment1late_experiment2late_experiment3late_experiment4late_experiment5late_experimentFinallate_experimentNotRelevantnewnoAnswer1noAnswer2noAnswer3noAnswer4noAnswer5noAnswer6noAnswer7noAnswerFinalnotRelevantpre-successrecallrepeatsuccessundistrib
mobile_tel
string | (string | null)
(query)

order
string
(query)
Available values : asc, desc
Default value : desc
--ascdesc
page
integer
(query)
Default value : 1
minimum: 1
limit
integer
(query)
Default value : 50
maximum: 200
minimum: 1

Responses
Code
Description
Links
200
Successful Response
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"items": [
{
"id": 0,
"date": "2025-10-10 13:49:10",
"success_date": "2025-10-10 13:49:10",
"date_updated": "2025-10-10 13:49:10",
"status": "string",
"status_name": "string",
"mobile_tel": "string",
"name": "string",
"site": "string",
"mobile_operator": "string",
"mobile_operator_region": "string",
"page": "string",
"ym_uid": "string",
"utm": {
"source": "string",
"campaign": "string",
"medium": "string",
"term": "string",
"content": "string"
}
}
],
"total": 0
}
No links
401
Невалидный или просроченный токен
No links
403
Нет доступа к этому API
No links
404
Проект не найден
No links
422
Validation Error
Media type
application/json
Example Value
Schema
{
"detail": [
{
"loc": [
"string",
0
],
"msg": "string",
"type": "string",
"input": "string",
"ctx": {}
}
]
}

Лиды

Через тот же запрос (см. Контакты) вытягиваем только успешные (квал лиды):
id = ID лида
success_date = дата
mobile_tel = номер телефона
name = комментарий
site = источник

Возможно API-запрос нужен другой, решай сам

Далее справа доступные для редактирования клиентом столбцы:
Запись = кнопка для скачивания записи (значок гарнитуры)
Обратная связь = текстовое поле для комментария клиента
Статус = выбор одного из значений: “не обработан” (у всех по умолчанию), “переговоры”, “не целевой”, “отказ”, “купил”.
Сумма = числовое поле с подсчетом в рублях
Фильтры:

1. Поиск по номеру телефона или ID лида
2. Фильтр по датам (период)
3. Фильтр по статусам

Кнопка экспорта - скачивается excel-файл

API метод для скачивания файлов (их может быть несколько) с записью диалога:

GET/v1/crm/open-api/answers/{answer_id}/calls
Ссылки на записи звонков по заявке
Parameters
Try it out
Name
Description
answer_id \*
integer
(path)

Responses
Code
Description
Links
200
Successful Response
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"items": [
{
"link": "string",
"date": "string"
}
]
}
No links
401
Невалидный или просроченный токен
No links
403
Нет доступа к этому API
No links
404
Заявка не найдена
No links
422
Validation Error
Media type
application/json
Example Value
Schema
{
"detail": [
{
"loc": [
"string",
0
],
"msg": "string",
"type": "string",
"input": "string",
"ctx": {}
}
]
}
No links
502
Ошибка CRM
No links
504
CRM недоступен

Источники

Система делает запрос на выгрузку всех тегов (источников) каждое утро в 09:00 за интервал с даты 1 июня 2026 года по настоящее время. Скрытые источники не надо показывать (show_locked = false)

Записываются данные вот так:
ID = “id”
Источник = “name” после очистки (убираем ID оператора связи перед _ и ID источника после _. Пример: получили тег “B111*74951270967_20168” и убрали оттуда B11 и 20168, оставив только номер “74951270967”)
Оператор = ID оператора связи перед * источника, присваиваем значения такие:
B111 = “Ростелеком”
B222 и B223 = “Билайн”
B333 = “МТС”
B444 = “Мегафон”
Контактов = “new_answer”
Лидов = “success”
Конверсия = “conversion”
Себестоимость = “sebes”
Доля нецелевых = расчет по формуле: значение “Лидов” разделить на кол-во строк (соответствующих условию переменная “name” в разделе Источник = переменная “site” в разделе Лиды) со статусом “Не целевой” в разделе “Лиды” и умножить на 100
Продаж = кол-во строк со статусом “Купил” в разделе Лиды (соответствующих условию переменная “name” в разделе Источник = переменная “site” в разделе Лиды)
Статус = “norm_work” = “true” (активен) или “false” (Не активен)
Три точки = кнопка для изменения статуса лида (см. ниже отдельный запрос для реализации этой функции)

По каждому столбцу есть функция сортировки. Страницы не скрываем, выводим до 5 000 значений.

Фильтр:

1. Использует тот же API-метод но меняет уже даты сообразно отмеченным в календаре (если не отмечен то так же с 1 июня 2026)
2. Фильтровать можно по периоду, галочка для фильтра по источникам где есть лиды (success = 1 и более) и по статусу (активен/не активен)
3. Чтобы фильтр активировался и отправил запрос нужно нажать кнопку “Запустить фильтрацию”

Экспорт:
Выгружает все источники (после фильтрации в том числе) в excel-файл

API-метод:

GET /v1/vdl/api/tags/get_by_project_and_date/{crm_id}
Список тегов проекта с агрегатами за произвольный период
Аналог /get_by_project, но метрики агрегируются за интервал start_date..end_date. Используется для отчётности и исторических выгрузок.
Parameters
Try it out
Name
Description
crm_id \*
integer
(path)

page
integer
(query)
Default value : 1
limit
integer
(query)
Default value : 20
start_date
string | (string | null)($date)
(query)

end_date
string | (string | null)($date)
(query)

tag_search
string | (string | null)
(query)

show_locked
boolean
(query)
Default value : false
--truefalse
filter_by_norm_work
boolean | (boolean | null)
(query)
--truefalse
filter_by_unsucess_block
boolean | (boolean | null)
(query)
--truefalse
filter_by_label
string | (string | null)
(query)

filter_by_type
array<string> | (array<string> | null)
(query)
Список типов тегов для фильтрации.
Default value : List []
filter_by_status
array<string> | (array<string> | null)
(query)
Список статусов тегов для фильтрации.
Available values : active, inactive, wait_on, wait_off
Default value : List []
--activeinactivewait_onwait_off
sort_by
string | (string | null)
(query)
Available values : limit, sebes, success, new_answer, fuck_limit
--limitsebessuccessnew_answerfuck_limit
sort_order
string | (string | null)
(query)
Available values : asc, desc
--ascdesc
sebes_min
integer | (integer | null)
(query)
minimum: 0
sebes_max
integer | (integer | null)
(query)
minimum: 0
success_min
integer | (integer | null)
(query)
minimum: 0
success_max
integer | (integer | null)
(query)
minimum: 0
new_answer_min
integer | (integer | null)
(query)
minimum: 0
new_answer_max
integer | (integer | null)
(query)
minimum: 0
conversion_min
number | (number | null)
(query)
minimum: 0
conversion_max
number | (number | null)
(query)
minimum: 0

Request body
application/json
Example Value
Schema
[
"string"
]
Responses
Code
Description
Links
200
Страница тегов с агрегатами за период.
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"total_count": 0,
"tags": [
{
"id": 0,
"crm_project_id": 0,
"type": "string",
"name": "string",
"norm_work": true,
"status": "string",
"limit": 0,
"fuck_limit": 0,
"sebes_block_until": "2026-08-02T09:13:17.979Z",
"new_answer": 0,
"sebes": 0,
"success": 0,
"conversion": 0,
"operator_locked": true,
"manual_locked": true,
"unsuccess_block": true,
"notifications": [
"string"
]
}
]
}
No links
401
Невалидный, истёкший или отсутствующий Bearer-токен.
No links
422
Ошибка валидации тела запроса, query- или path-параметров. FastAPI/Pydantic возвращает массив detail со списком полей и ошибок.
No links
502
Внутренняя ошибка обработки запроса (502 Bad Gateway).

Кнопка три точки у источника:
Выбор кнопки “Включить” или “Выключить” делает API-запрос по ID источника

Как работает:
Включить = “norm_work”= true и ставим “limit” = 50
Выключить = “norm_work”= false и ставим “limit” = 0

API-метод:

PATCH/v1/vdl/api/tags/update/{tag_id}
Обновление одного тега
Частично обновляет тег по tag_id. Принимает любое подмножество полей UpdateTagSchema — поля со значением null игнорируются.
Parameters
Try it out
Name
Description
tag_id \*
integer
(path)

Request body
application/json
Example Value
Schema
{
"norm_work": true,
"limit": 0,
"sebes_block_days": 0,
"manual_locked": true
}
Responses
Code
Description
Links
200
Тег обновлён.
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"additionalProp1": {}
}
No links
401
Невалидный, истёкший или отсутствующий Bearer-токен.
No links
404
Тег с таким tag_id не найден.
No links
422
Ошибка валидации тела запроса, query- или path-параметров. FastAPI/Pydantic возвращает массив detail со списком полей и ошибок.
No links
502
Внутренняя ошибка обработки запроса (502 Bad Gateway).

Настройки автоматизации:
Если “Автоматическая чистка” включена, то делается запрос ко всем тегам, у которых значение “new_answer” равно или больше значению “мин. контактов на 1 лид”. Фильтрация за 28 дней делается. Далее если значение “conversion” меньше чем значение “Мин. конверсия”, то тег включен (norm_work = false, limit = 0).
Если “Автоматическое управление” включено, то мы просто берем все теги где значение “conversion” равно или больше чем значение “Мин. конверсия” и ставим им norm_work = true, limit = 50
Всё это делается в рамках одного API-запроса 1 раз в день в 18:00

API-метод:

PATCH/v1/vdl/api/tags/update
Массовое обновление тегов
Применяет одно и то же изменение UpdateTagSchema ко всем тегам, ID которых перечислены в query-параметре tag_ids.
Parameters
Try it out
No parameters
Request body
application/json
Example Value
Schema
{
"update_tag_schema": {
"norm_work": true,
"limit": 0,
"sebes_block_days": 0,
"manual_locked": true
},
"tag_ids": [
0
]
}
Responses
Code
Description
Links
200
Теги обновлены.
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"additionalProp1": {}
}
No links
401
Невалидный, истёкший или отсутствующий Bearer-токен.
No links
422
Ошибка валидации тела запроса, query- или path-параметров. FastAPI/Pydantic возвращает массив detail со списком полей и ошибок.
No links
502
Внутренняя ошибка обработки запроса (502 Bad Gateway).

Кнопка Добавить источник:

1. Вылезает плашка с текстовым полем для загрузки номеров или сайтов (сразу большое поле чтобы можно было сразу много грузить).
2. Туда вставляются номера или сайты
3. Выбираем тип источника “номер” или “сайт” (source_type = phone или domain). Список типов тегов для включения в выдачу (см. /api/tags/available_tags_types).
4. Делаем API-запрос для массовой загрузки источников в проект

API-метод:

PUT/v1/vdl/api/sources/add_all/{crm_id}
Пакетное добавление источников в проект
Принимает массив значений источников и добавляет их в проект одной операцией.
Parameters
Try it out
Name
Description
crm_id \*
integer
(path)

Request body
application/json
Example Value
Schema
{
"source": [
"string"
],
"subsource": "string",
"source_from": "ishod",
"source_type": "phone",
"active_duplicate_source": false,
"label": "string",
"label_color": "red",
"geo_ids": [
0
]
}
Responses
Code
Description
Links
200
Источники добавлены.
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"additionalProp1": {}
}
No links
401
Невалидный, истёкший или отсутствующий Bearer-токен.
No links
422
Ошибка валидации тела запроса, query- или path-параметров. FastAPI/Pydantic возвращает массив detail со списком полей и ошибок.
No links
502
Внутренняя ошибка обработки запроса (502 Bad Gateway).

Скрытая функция:

1. Сразу же (через 5 мин) после добавления источника с типом “домен” система с помощью API-метода GET/v1/vdl/api/sources/get_by_project/{crm_id} делает фильтрацию по типу source_type = domain
2. После того, как система отфильтрует только теги с типом “домен” она запускает API-метод POST/v1/vdl/api/sources/update_settings для массового обновления флагов парсинга у этих источников и ставит parse_phone = false и parse_ishod = true.
3. Далее система запускает новую фильтрацию при помощи уже известного нам метода GET/v1/vdl/api/tags/get_by_project_and_date/{crm_id}
   Список тегов проекта с агрегатами за произвольный период
4. Фильтрует теги (уже не источники а именно теги) filter_by_type = domain
   5.И наконец все эти отфильтрованные теги отключает через запрос PATCH/v1/vdl/api/tags/update ставит norm_work = false, limit = 0

СУТЬ = мы после добавления источников с типом “сайт” (домен) должны включить у них автоматический сбор номеров (оставление заявок роботом), но при этом выключить теги источника, чтобы не шли лиды с самих сайтов (просто посетители сайтов нам не нужны).

API-метод для шага №1:

GET/v1/vdl/api/sources/get_by_project/{crm_id}
Список источников проекта
Возвращает страницу источников (телефонов/доменов) проекта без агрегированных метрик. Поддерживает поиск по значению/типу, фильтрацию по решению оператора и флагам парсинга.
Parameters
Try it out
Name
Description
crm_id \*
integer
(path)

page
integer
(query)
Default value : 1
limit
integer
(query)
Default value : 20
phone_search
string | (string | null)
(query)

phone_type_search
string | (string | null)
(query)

will_work
string | (string | null)
(query)
Available values : In work, Not in work, Not checked
--In workNot in workNot checked
hidden
string
(query)
Available values : only_visible, only_hidden, all
Default value : only_visible
--only_visibleonly_hiddenall
source_type
string | (string | null)
(query)
Available values : phone, domain
--phonedomain
parse_ishod
boolean | (boolean | null)
(query)
--truefalse
parse_phone
boolean | (boolean | null)
(query)
--truefalse
filter_by_label
string | (string | null)
(query)

Request body
application/json
Example Value
Schema
[
"string"
]
Responses
Code
Description
Links
200
Страница источников проекта.
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"total_count": 0,
"sources": [
{
"id": 0,
"crm_project_id": 0,
"phone": "string",
"phone_type": "string",
"will_work": true,
"source_from": "string",
"source_type": "string",
"parse_ishod": true,
"parse_phone": true,
"label": "string",
"label_color": "string",
"hidden": false
}
]
}
No links
401
Невалидный, истёкший или отсутствующий Bearer-токен.
No links
422
Ошибка валидации тела запроса, query- или path-параметров. FastAPI/Pydantic возвращает массив detail со списком полей и ошибок.
No links
502
Внутренняя ошибка обработки запроса (502 Bad Gateway).

API-метод для шага №2:

POST/v1/vdl/api/sources/update_settings
Массовое обновление флагов парсинга у источников
Обновляет флаги parse_phone и/или parse_ishod у всех источников из source_ids. Незаданные поля не меняются.
Parameters
Try it out
No parameters
Request body
application/json
Example Value
Schema
{
"source_ids": [
0
],
"parse_phone": true,
"parse_ishod": true,
"label": "string",
"label_color": "red",
"geo_ids": [
0
],
"active_subsource": false
}
Responses
Code
Description
Links
200
Настройки источников обновлены.
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"additionalProp1": {}
}
No links
401
Невалидный, истёкший или отсутствующий Bearer-токен.
No links
422
Ошибка валидации тела запроса, query- или path-параметров. FastAPI/Pydantic возвращает массив detail со списком полей и ошибок.
No links
502
Внутренняя ошибка обработки запроса (502 Bad Gateway).

Скрипт

Здесь просто через API-запрос каждый день в 20:00 подтягивается HTML-документ со скриптом для оператора КЦ. Редактировать его никто не может!

API-метод:

GET/v1/crm/open-api/projects/{project_id}/script
Скрипт проекта
Текст скрипта оператора. Поле script — сырой HTML, экранирование на клиенте.
Parameters
Try it out
Name
Description
project_id \*
integer
(path)

Responses
Code
Description
Links
200
Successful Response
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"project_id": 0,
"name": "string",
"script": "string",
"script_lvl": 0
}
No links
401
Невалидный или просроченный токен
No links
403
Нет доступа к этому API
No links
404
Проект не найден
No links
422
Validation Error
Media type
application/json
Example Value
Schema
{
"detail": [
{
"loc": [
"string",
0
],
"msg": "string",
"type": "string",
"input": "string",
"ctx": {}
}
]
}

Можно убрать:

1. Кнопку Редактировать
2. Кнопку Сгененрировать AI
3. Кнопку Отменить
4. Кнопку История
5. Блок статистики
6. Блок Истории версий

Финансы

API-запросов здесь нет.

Список платежей = берется из мастер-кабинета (вносит туда сотрудник - отмечает галочками просто оплаченные счета)

Данные для аналитики:
LTV = сумма всех платежей внутри кабинета
Ожидается = сумма всех выставленных счетов
Просрочку меняем на “Всего оплат” = кол-во платежей в списке
MRR и Оплачено убираем просто

Кнопка Сформировать счет:

1. Берет данные плательщика из раздела “Плательщик”
2. Заполняет ими вот этот шаблон https://docs.google.com/document/d/1u2srF5ifs7oWWqDbQkXCW6mztPRk_Jw1WICNa8Vli5k/edit?usp=sharing
3. Указывает кол-во штук. Система сама умножает это кол-во на цену лида, пакета или контакта (зависит от типа оплаты который указан в мастер-кабинете в разделе “Проекты”) и получает итоговую сумму для оплаты
4. Скачивает счет в PDF формате
5. В мастер-кабинет добавляется счет с надписью ожидает оплаты с указанием суммы из пункта 3.

Кнопка Закрывающие документы:

1. Открывается список платежей с галочками для выбора одного или нескольких по которым будем делать Акт выполненных работ
2. На основе сумм платежей и дат (дата самого раннего платежа = дата начала работ, дата окончания равно = сегодня) формируется акт по шаблону ниже https://docs.google.com/document/d/1ROOb5jLqyqxQ2D2-QQ-xLaLQHta1h5gkxBb39gReVuE/edit?usp=sharing
3. Акт заполняется данными клиента из раздела Плательщик
4. Заполненный акт скачивается в формате PDF

БАЛАНС:

1. Сумма слева в рублях начисляется на баланс автоматически после получения платежом статуса “оплачено” в мастер-кабинете. Если на балансе уже есть сумма больше нуля, то сумма просто добавляется к имеющемуся балансу. Если баланс минусовой то сумма также добавляется к минусу (из суммы вычитается долг)
2. Сумма списывается согласно цене проекта указанной в мастер-кабинете в разделе “Проекты”. Если тип проекта квалы, то сумма списывается за каждый лид, который добавляется в разделе Лиды. Если тип проекта пакет, то за каждый контакт в разделе контакты. Если тип проекта номера то тоже за каждый контакт.
3. Кол-во штук справа также берется из последнего счета. Но если тип проекта поменялся, то она НЕ ДОБАВЛЯЕТСЯ к уже имеющемуся количеству, а заменяется. Например: уже было 170/180 штук, а потом клиент оплатил еще 200, то теперь в балансе будет 0/200 (то есть он обнулится в плане кол-ва). Кол-во штук так же вычитается согласно типу проекта по разделу Контакты или Лиды. А если тип проекта не менялся, то новое кол-во добавляется к уже имеющемуся.

Плательщик

Тут все просто - анкета с данными которые заполняет и редактирует клиент и менеджер как угодно.

Настройки

Заполняются следующие данные и отправляются через API-запрос №1 при нажатии кнопки вверху страницы “СОХРАНИТЬ НАСТРОЙКИ”:
Статус проекта = активен/пауза (по умолчанию активен, но если нажата пауза то выгрузки и обзвон сразу выключаются)
Часовой пояс = “timezone”
Выгрузки = work_client_status = active/stop
Обзвон = call_center_status = active/stop. У проекта по номерам (контактам) всегда статус “numbers”.
Расписание = галочками отмечается расписание выгрузок и обзвона
CRM = выбор интеграции с CRM (API-метод №2)
Мессенджеры = выбор интеграции с мессенджерами (API-методы отдельные ниже)
Управление доступом = менеджер может скрыть некоторые разделы для клиента (см. в начале ТЗ правила)

Расписание:

1. Делает определенный запрос API-методом №1 каждый день вечером в 20:00 по МСК. Пример запросов по дням недели ниже
2. Логика расписания под работу проекта только в будни:
   ПН: work_client_status = active; call_center_status = active
   ВТ: work_client_status = active; call_center_status = active
   СР: work_client_status = active; call_center_status = active
   ЧТ: work_client_status = active; call_center_status = active
   ПТ: work_client_status = stop; call_center_status = pause_daily
   СБ: work_client_status = stop; call_center_status = pause_daily
   ВС: work_client_status = active; call_center_status = active
3. Логика расписания под работу проекта только в выходные:
   ПН: work_client_status = stop; call_center_status = pause_daily
   ВТ: work_client_status = stop; call_center_status = pause_daily
   СР: work_client_status = stop; call_center_status = pause_daily
   ЧТ: work_client_status = stop; call_center_status = pause_daily
   ПТ: work_client_status = active; call_center_status = active
   СБ: work_client_status = active; call_center_status = active
   ВС: work_client_status = stop; call_center_status = pause_daily
4. Логика расписания под работу проекта каждый день:
   ПН: work_client_status = active; call_center_status = active
   ВТ: work_client_status = active; call_center_status = active
   СР: work_client_status = active; call_center_status = active
   ЧТ: work_client_status = active; call_center_status = active
   ПТ: work_client_status = active; call_center_status = active
   СБ: work_client_status = active; call_center_status = active
   ВС: work_client_status = active; call_center_status = active

Интеграции с CRM и мессенджерами:
Есть все кроме MAX, он тоже нужен. Смотри API ниже под каждую интеграцию. Внешний вид полей надо взять из ЛК Leads Factory.

API-метод №1:

PATCH
/v1/crm/open-api/projects/{project_id}
Редактирование проекта
Parameters
Try it out
Name
Description
project_id \*
integer
(path)

Request body
application/json
Example Value
Schema
{
"name": "string",
"regions": [
0
],
"client_regions": [
0
],
"sphere": "string",
"status": "active",
"work_client_status": "new",
"timezone": 0,
"call_center_status": "active",
"experiment": 0,
"uniq": 0,
"late_experiment_delta_hours": 0,
"transfer_to_manager": true,
"transfer_to_manager_phone": "string",
"transfer_to_manager_api_delay": 0,
"additional_columns": [
{
"key": "string",
"name": "string"
}
]
}
Responses
Code
Description
Links
200
Successful Response
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"id": 0,
"name": "string",
"name_for_operator": "string",
"status": "string",
"work_client_status": "string",
"call_center_status": "string",
"tags": [
"string"
],
"sphere": "string",
"regions": [
{
"id": 0,
"name": "string"
}
],
"client_regions": [
{
"id": 0,
"name": "string"
}
],
"timezone": 0,
"experiment": 0,
"uniq": 0,
"experiment_penalty_delta_hours": 0,
"late_experiment_delta_hours": 0,
"transfer_to_manager": true,
"transfer_to_manager_phone": "string",
"transfer_to_manager_api_delay": 0,
"additional_columns": [
{
"key": "string",
"name": "string"
}
],
"managers": [
0
],
"numbers": true,
"prozvon_base": true,
"vdl": true,
"lal": true,
"archive": true,
"days_to_reset": 0,
"links_upload": [
"string"
]
}
No links
401
Невалидный или просроченный токен
No links
403
Нет доступа к этому API
No links
404
Проект не найден
No links
422
Validation Error
Media type
application/json
Example Value
Schema
{
"detail": [
{
"loc": [
"string",
0
],
"msg": "string",
"type": "string",
"input": "string",
"ctx": {}
}
]
}
No links
502
Не удалось обработать запрос
No links
504
Сервис временно недоступен

API-метод для Телеграм

GET
/v1/crm/open-api/projects/{project_id}/integrations/telegram
Интеграция Telegram
Parameters
Try it out
Name
Description
project_id \*
integer
(path)

Responses
Code
Description
Links
200
Successful Response
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"is_active": false,
"send_call_link": false,
"chat_id": "",
"domain": "string",
"utm_source": "string",
"utm_campaign": "string",
"utm_medium": "string",
"utm_term": "string",
"utm_content": "string"
}
No links
401
Невалидный или просроченный токен
No links
403
Нет доступа к этому API
No links
404
Проект не найден
No links
422
Validation Error
Media type
application/json
Example Value
Schema
{
"detail": [
{
"loc": [
"string",
0
],
"msg": "string",
"type": "string",
"input": "string",
"ctx": {}
}
]
}
No links
502
Не удалось обработать запрос
No links
504
Сервис временно недоступен
No links

API-метод для Битрикс

GET
/v1/crm/open-api/projects/{project_id}/integrations/bitrix
Интеграция Bitrix
Parameters
Try it out
Name
Description
project_id \*
integer
(path)

Responses
Code
Description
Links
200
Successful Response
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"is_active": false,
"send_deal": false,
"webhook": "",
"title": "",
"status_id": "",
"source_id": "string",
"assigned_by_id": "",
"comment": "",
"extra_data": {
"additionalProp1": "string",
"additionalProp2": "string",
"additionalProp3": "string"
},
"utm_source": "string",
"utm_campaign": "string",
"utm_medium": "string",
"utm_term": "string",
"utm_content": "string"
}
No links
401
Невалидный или просроченный токен
No links
403
Нет доступа к этому API
No links
404
Проект не найден
No links
422
Validation Error
Media type
application/json
Example Value
Schema
{
"detail": [
{
"loc": [
"string",
0
],
"msg": "string",
"type": "string",
"input": "string",
"ctx": {}
}
]
}
No links
502
Не удалось обработать запрос
No links
504
Сервис временно недоступен

API-метод для Амо

GET
/v1/crm/open-api/projects/{project_id}/integrations/amocrm
Интеграция AmoCRM
Parameters
Try it out
Name
Description
project_id \*
integer
(path)

Responses
Code
Description
Links
200
Successful Response
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"active": false,
"domain": "",
"page": "string",
"pipeline_id": 0,
"status_id": 0,
"title": "",
"token": "",
"roistat": "string",
"responsible_user": 0,
"time_delta": 0,
"tags": [],
"utm_source": "string",
"utm_campaign": "string",
"utm_medium": "string",
"utm_term": "string",
"utm_content": "string"
}
No links
401
Невалидный или просроченный токен
No links
403
Нет доступа к этому API
No links
404
Проект не найден
No links
422
Validation Error
Media type
application/json
Example Value
Schema
{
"detail": [
{
"loc": [
"string",
0
],
"msg": "string",
"type": "string",
"input": "string",
"ctx": {}
}
]
}
No links
502
Не удалось обработать запрос
No links
504
Сервис временно недоступен

API-метод для почты

GET
/v1/crm/open-api/projects/{project_id}/integrations/email
Интеграция Email
Parameters
Try it out
Name
Description
project_id \*
integer
(path)

Responses
Code
Description
Links
200
Successful Response
Media type
application/json
Controls Accept header.
Example Value
Schema
[
{
"id": 0,
"is_active": false,
"reciever": "",
"site": "",
"utm_source": "string",
"utm_campaign": "string",
"utm_medium": "string",
"utm_term": "string",
"utm_content": "string"
}
]
No links
401
Невалидный или просроченный токен
No links
403
Нет доступа к этому API
No links
404
Проект не найден
No links
422
Validation Error
Media type
application/json
Example Value
Schema
{
"detail": [
{
"loc": [
"string",
0
],
"msg": "string",
"type": "string",
"input": "string",
"ctx": {}
}
]
}
No links
502
Не удалось обработать запрос
No links
504
Сервис временно недоступен

Мастер-кабинет

Дизайн и стиль тот же что и у ЛК для клиентов

Дашборд
Есть фильтрация по календарным месяцам (август, сентябрь и тд и еще кнопка “весь год” = статистика за последние 12 месяцев)

Статистика по менеджерам:
По каждому менеджеру из раздела Проекты выводим список активных проектов менеджера на начало месяца (на дату до 7 числа включительно)
Далее выводим количество платежей в этом месяце по проектам менеджера
Далее общую сумму этих оплат
Далее Retention = значение пункта 2 делим на пункт 1 и умножаем на 100
Далее выводим “Бонус менеджера” = пункт 3 умножить на 10%

Статистика по клиентам:
Выводим все проекты по которым были платежи в этом месяце
Ранжируем их по совокупной сумме платежей (кто больше всех выше, кто меньше всех ниже)

Проекты

Таблица со следующими столбцами:
Название = название проекта
Менеджер = ответственный менеджер проекта
Тип проекта = ручной выбор “контакты”, “пакет” или “квалы”. Влияет на то, какой тип оплаты имеет право выбирать клиент при оплате
Контактов выгружено = кол-во контактов из ЛК
Лидов выгружено = кол-во лидов из ЛК
Продаж = кол-во продаж из ЛК
Сфера = ниша проекта
Цена = ручное заполнение в рублях
Статус = вручную заполняется “Продлился” или “Не продлился”
LTV = сумма всех платежей за все время
Платежей = кол-во платежей
Средний чек = LTV делить на кол-во платежей
Логин = логин клиента (нельзя менять)
Пароль = пароль клиента (можно менять)
Управлять = кнопка выбора “Отключить/Включить” (запрос PATCH/v1/crm/open-api/projects/{project_id} Редактирование проекта) и “Скрыть” - чтобы скрыть всю строку из таблицы

Также есть кнопка “Показать скрытые” - для возврата скрытых проектов

Кнопка “Сотрудники” = открывается список где можно внести нового сотрудника или убрать любого

Кнопка Создать проект:

1. Сначала заполняем данные в открывшемся окне:
   название = название проекта
   тип = список для выбора: VDL (квалы), ПКТ (пакет), НОМЕРА (контакты).
   регион = РФ или конкретный субъект (список для выбора)
   сфера = ниша проекта (вручную вписываем)
   менеджер = кто отвечает за проект (выбираем из списка)
   цена = идет в раздел Проекты

2. Далее после нажатия кнопки “Создать” создается новый ЛК с автоматической выдачей доступов: пароль-логин для сотрудника (всегда один и тот же для всех сотрудников) и пароль-логин для клиента (всегда разный) и ссылка на кабинет (если нужна). Также появляется запись в таблице раздела “Проекты” в мастер-кабинете
3. Далее делается API-запрос на создание кабинета с указанием типа проекта, названия, региона и статуса (active). Итоговое название имеет такой вид: “Москва/Peremoney ЛКП VDL/Коррекция зрения/Имплантсити”
4. После чего появляется надпись что проект создан и показываются данные для входа клиента и кнопка “Перейти” для входа в ЛК

API-метод:

POST/v1/crm/open-api/projects
Создание проекта
Создаёт проект в CRM. Допустимые значения type отдаёт GET /projects/types.
Ручка не идемпотентна: повтор запроса после 504 может создать дубль проекта.
Parameters
Try it out
No parameters
Request body
application/json
Example Value
Schema
{
"name": "string",
"type": 0,
"regions": [
1
],
"status": "new"
}
Responses
Code
Description
Links
201
Successful Response
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"id": 0
}
No links
400
Невалидные данные проекта
No links
401
Невалидный или просроченный токен
No links
403
Нет доступа к этому API
No links
409
Проект с таким именем уже существует
No links
422
Validation Error
Media type
application/json
Example Value
Schema
{
"detail": [
{
"loc": [
"string",
0
],
"msg": "string",
"type": "string",
"input": "string",
"ctx": {}
}
]
}
No links
502
Не удалось обработать запрос
No links
504
Сервис временно недоступен

API-метод:

GET/v1/crm/open-api/projects/types
Типы проектов, доступные для создания
Parameters
Try it out
No parameters
Responses
Code
Description
Links
200
Successful Response
Media type
application/json
Controls Accept header.
Example Value
Schema
{
"items": [
{
"id": 0,
"name": "string"
}
]
}
No links
401
Невалидный или просроченный токен
No links
403
Нет доступа к этому API

Кнопка Связать с другим:

Работает точно так же как и кнопка “Создать проект”, но только без API-запросов по созданию кабинета. При нажатии на кнопку просто создается новый кабинет - копия существующего. Единственное что может отличаться:

- название (должно отличаться)
- тип
- цена
- менеджер

Платежи

1. Платежи попадают сюда автоматически при формировании счета в ЛК
2. По каждому платежу написаны:

- проект
- юр лицо клиента
- сумма
- менеджер
- статус (“оплачено” или “ожидает”) - регулирует менеджер вручную

3. Платежи которые ожидаются всегда вверху по дате создания (новые выше)
4. Любой платеж можно удалить или вновь поменять статус на ожидает
