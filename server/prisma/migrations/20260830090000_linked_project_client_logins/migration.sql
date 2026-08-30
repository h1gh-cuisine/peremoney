-- Старые подключённые проекты создавали клиентские логины client-<id>-<suffix>.
-- Переводим их на короткое название проекта, не затрагивая пароль и не создавая
-- конфликтов уникальности. Конфликтующие названия остаются без изменений.
WITH candidates AS (
  SELECT
    u.id,
    regexp_replace(btrim(regexp_replace(c.name, '^.*/', '')), '[[:space:]]+', ' ', 'g') AS new_login
  FROM "User" u
  JOIN "Cabinet" c ON c.id = u."cabinetId"
  WHERE u.role = 'LIMITED'
    AND u.login LIKE 'client-%'
    AND c."providerProjectId" IS NOT NULL
), unique_candidates AS (
  SELECT id, new_login
  FROM (
    SELECT id, new_login, count(*) OVER (PARTITION BY new_login) AS same_name_count
    FROM candidates
    WHERE new_login <> ''
  ) ranked
  WHERE same_name_count = 1
), eligible AS (
  SELECT candidate.id, candidate.new_login
  FROM unique_candidates candidate
  WHERE NOT EXISTS (
    SELECT 1
    FROM "User" existing
    WHERE existing.login = candidate.new_login
      AND existing.id <> candidate.id
  )
)
UPDATE "User" target
SET login = eligible.new_login
FROM eligible
WHERE target.id = eligible.id;
