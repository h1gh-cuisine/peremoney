#!/usr/bin/env node
/**
 * Разово отключает теги проекта Leads Factory с conversion < THRESHOLD,
 * без условия по минимальному числу контактов (порог только по конверсии).
 *
 * Запуск:
 *   LEADS_FACTORY_TOKEN=... node scripts/disable-low-conversion-tags.js 26011 20
 *
 * Первый аргумент — crm_id (project_id) в Leads Factory, второй — порог
 * конверсии в процентах (по умолчанию 20). Без третьего аргумента "apply"
 * скрипт только ПОКАЗЫВАЕТ, что было бы отключено (dry-run).
 *
 *   node scripts/disable-low-conversion-tags.js 26011 20 apply
 */
const BASE_URL = process.env.LEADS_FACTORY_BASE_URL || 'https://openapi.leads-factory.ru/v1';
const TOKEN = process.env.LEADS_FACTORY_TOKEN;
const [, , crmIdArg, thresholdArg, mode] = process.argv;

if (!TOKEN) { console.error('Задайте LEADS_FACTORY_TOKEN в окружении (см. server/.env)'); process.exit(1); }
if (!crmIdArg) { console.error('Использование: node disable-low-conversion-tags.js <crm_id> [порог=20] [apply]'); process.exit(1); }
const crmId = Number(crmIdArg);
const threshold = thresholdArg !== undefined ? Number(thresholdArg) : 20;
const apply = mode === 'apply';

async function fetchAllTags() {
  const startDate = '2026-04-01';
  const endDate = new Date().toISOString().slice(0, 10);
  const items = [];
  let page = 1;
  for (;;) {
    const url = new URL(`${BASE_URL}/vdl/api/tags/get_by_project_and_date/${crmId}`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('limit', '5000');
    url.searchParams.set('start_date', startDate);
    url.searchParams.set('end_date', endDate);
    url.searchParams.set('show_locked', 'false');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json' } });
    if (!res.ok) throw new Error(`GET tags ${res.status}: ${await res.text()}`);
    const raw = await res.json();
    const pageItems = Array.isArray(raw) ? raw : raw.tags ?? raw.items ?? [];
    const total = Array.isArray(raw) ? pageItems.length : raw.total_count ?? raw.total ?? pageItems.length;
    items.push(...pageItems);
    if (page * 5000 >= total || pageItems.length === 0) break;
    page += 1;
  }
  return items;
}

async function disableTags(tagIds) {
  const res = await fetch(`${BASE_URL}/vdl/api/tags/update`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ tag_ids: tagIds, update_tag_schema: { norm_work: false, limit: 0 } }),
  });
  if (!res.ok) throw new Error(`PATCH tags/update ${res.status}: ${await res.text()}`);
  return res.json().catch(() => undefined);
}

(async () => {
  console.log(`Проект ${crmId}: забираю теги (порог конверсии < ${threshold}%)...`);
  const tags = await fetchAllTags();
  console.log(`Всего тегов получено: ${tags.length}`);

  const candidates = tags.filter((t) => Number(t.conversion ?? 0) < threshold && t.norm_work !== false);
  console.log(`\nБудут отключены (conversion < ${threshold}%, сейчас активны): ${candidates.length}`);
  for (const t of candidates) {
    const name = t.name ?? t.tag ?? t.tag_name ?? String(t.id);
    console.log(`  id=${t.id}  conversion=${t.conversion}%  new_answer=${t.new_answer}  success=${t.success}  ${name}`);
  }

  if (!candidates.length) { console.log('\nНечего отключать.'); return; }

  if (!apply) {
    console.log(`\nЭто dry-run — ничего не отправлено. Чтобы реально отключить, добавьте "apply" третьим аргументом:`);
    console.log(`  node scripts/disable-low-conversion-tags.js ${crmId} ${threshold} apply`);
    return;
  }

  console.log(`\nОтправляю PATCH .../tags/update на ${candidates.length} тегов...`);
  const result = await disableTags(candidates.map((t) => t.id));
  console.log('Готово:', JSON.stringify(result));
})().catch((err) => { console.error('Ошибка:', err.message); process.exit(1); });
