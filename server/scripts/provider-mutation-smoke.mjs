import { readFileSync } from 'node:fs';

for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

if (process.env.ENABLE_PROVIDER_MUTATIONS !== 'YES') {
  throw new Error('Set ENABLE_PROVIDER_MUTATIONS=YES to confirm live Leads Factory changes');
}

const base = (process.env.LEADS_FACTORY_BASE_URL || 'https://openapi.leads-factory.ru/v1').replace(/\/$/, '');
const token = process.env.LEADS_FACTORY_TOKEN;
const projectId = Number(process.env.QA_PROVIDER_PROJECT_ID || 26962);
if (!token) throw new Error('LEADS_FACTORY_TOKEN is not configured');
if (!Number.isInteger(projectId) || projectId < 1) throw new Error('QA_PROVIDER_PROJECT_ID must be a positive integer');

function shape(value, depth = 0) {
  if (depth > 2) return typeof value;
  if (Array.isArray(value)) return { kind: 'array', length: value.length, item: value.length ? shape(value[0], depth + 1) : null };
  if (!value || typeof value !== 'object') return typeof value;
  return { kind: 'object', keys: Object.keys(value).sort(), fields: Object.fromEntries(
    Object.entries(value).slice(0, 20).map(([key, nested]) => [key, shape(nested, depth + 1)]),
  ) };
}

async function request(name, path, method = 'GET', body) {
  let response;
  let error;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      response = await fetch(base + path, {
        method,
        headers: {
          Accept: 'application/json', Authorization: `Bearer ${token}`,
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
      break;
    } catch (reason) {
      error = reason;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  if (!response) {
    console.log(JSON.stringify({ name, method, networkError: error instanceof Error ? error.message : 'unknown' }));
    return null;
  }
  const responseBody = await response.json().catch(() => null);
  console.log(JSON.stringify({ name, method, status: response.status, shape: shape(responseBody) }));
  return { ok: response.ok, status: response.status, body: responseBody };
}

// Idempotent for an active QA project: exercises PATCH without intentionally changing its final state.
await request('project-schedule-active', `/crm/open-api/projects/${projectId}`, 'PATCH', {
  work_client_status: 'active', call_center_status: 'active',
});

const today = new Date().toISOString().slice(0, 10);
const tagsResult = await request(
  'tags-for-mutation',
  `/vdl/api/tags/get_by_project_and_date/${projectId}?page=1&limit=1&start_date=2026-06-01&end_date=${today}&show_locked=false`,
);
const tagsBody = tagsResult?.body;
const tags = Array.isArray(tagsBody) ? tagsBody
  : tagsBody?.items ?? tagsBody?.results ?? tagsBody?.data?.items ?? tagsBody?.data ?? [];
const tag = Array.isArray(tags) ? tags[0] : undefined;
if (tag && Number.isInteger(Number(tag.id))) {
  const enabled = Boolean(tag.norm_work);
  const schema = { norm_work: enabled, limit: Number.isFinite(Number(tag.limit)) ? Number(tag.limit) : enabled ? 50 : 0 };
  await request('tag-single-same-state', `/vdl/api/tags/update/${tag.id}`, 'PATCH', schema);
  await request('tag-batch-same-state', '/vdl/api/tags/update', 'PATCH', { tag_ids: [Number(tag.id)], update_tag_schema: schema });
} else {
  console.log(JSON.stringify({ name: 'tag-single-same-state', skipped: 'No tag is available; set QA_PROVIDER_TAG_ID to test explicitly' }));
  console.log(JSON.stringify({ name: 'tag-batch-same-state', skipped: 'No tag is available; set QA_PROVIDER_TAG_ID to test explicitly' }));
}

const explicitTagId = Number(process.env.QA_PROVIDER_TAG_ID);
if ((!tag || !Number.isInteger(Number(tag.id))) && Number.isInteger(explicitTagId) && explicitTagId > 0) {
  await request('tag-single-explicit', `/vdl/api/tags/update/${explicitTagId}`, 'PATCH', { norm_work: false, limit: 0 });
  await request('tag-batch-explicit', '/vdl/api/tags/update', 'PATCH', { tag_ids: [explicitTagId], update_tag_schema: { norm_work: false, limit: 0 } });
}

const sourceValue = process.env.QA_PROVIDER_SOURCE;
if (sourceValue) {
  const sourceType = process.env.QA_PROVIDER_SOURCE_TYPE === 'phone' ? 'phone' : 'domain';
  await request('source-add', `/vdl/api/sources/add_all/${projectId}`, 'PUT', {
    source: [sourceValue], source_type: sourceType, active_duplicate_source: false,
    label: null, subsource: null, source_from: 'web', label_color: null, geo_ids: [],
  });
  const sourcesResult = await request('sources-after-add', `/vdl/api/sources/get_by_project/${projectId}?page=1&limit=5000&source_type=${sourceType}&hidden=only_visible`);
  const sourceItems = sourcesResult?.body?.sources ?? sourcesResult?.body?.items ?? [];
  const added = Array.isArray(sourceItems) && sourceItems.find((item) => item?.source === sourceValue || item?.phone === sourceValue);
  if (added && Number.isInteger(Number(added.id))) {
    await request('source-settings', '/vdl/api/sources/update_settings', 'POST', {
      source_ids: [Number(added.id)], parse_phone: false, parse_ishod: true,
    });
  } else {
    console.log(JSON.stringify({ name: 'source-settings', skipped: 'Added source is not visible yet' }));
  }
} else {
  console.log(JSON.stringify({ name: 'source-add', skipped: 'Set QA_PROVIDER_SOURCE; this creates persistent provider data' }));
  console.log(JSON.stringify({ name: 'source-settings', skipped: 'Requires QA_PROVIDER_SOURCE' }));
}

if (process.env.QA_CREATE_PROJECT === 'YES') {
  await request('project-create', '/crm/open-api/projects', 'POST', {
    name: `QA API smoke ${new Date().toISOString()}`, type: Number(process.env.QA_PROVIDER_PROJECT_TYPE || 4),
    regions: [Number(process.env.QA_PROVIDER_REGION_ID || 1)], status: 'active',
  });
} else {
  console.log(JSON.stringify({ name: 'project-create', skipped: 'Already live-tested as project 26962; set QA_CREATE_PROJECT=YES to create another persistent project' }));
}
