import { readFileSync } from 'node:fs';

for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

const base = (process.env.LEADS_FACTORY_BASE_URL || 'https://openapi.leads-factory.ru/v1').replace(/\/$/, '');
const token = process.env.LEADS_FACTORY_TOKEN;
if (!token) throw new Error('LEADS_FACTORY_TOKEN is not configured');
const projectId = process.env.QA_PROVIDER_PROJECT_ID || '26962';
const answerId = process.env.QA_PROVIDER_ANSWER_ID;

const checks = [
  ['project-types', '/crm/open-api/projects/types'],
  ['answers', `/crm/open-api/projects/${projectId}/answers?page=1&limit=1`],
  ['script', `/crm/open-api/projects/${projectId}/script`],
  ['tags', `/vdl/api/tags/get_by_project_and_date/${projectId}?page=1&limit=1&start_date=2026-08-23&end_date=2026-08-23&show_locked=false`],
  ['sources', `/vdl/api/sources/get_by_project/${projectId}?page=1&limit=1&hidden=only_visible`],
  ['tag-types', '/vdl/api/tags/available_tags_types'],
  ...['telegram', 'bitrix', 'amocrm', 'email'].map((name) => [`integration-${name}`, `/crm/open-api/projects/${projectId}/integrations/${name}`]),
  ...(answerId ? [['answer-calls', `/crm/open-api/answers/${answerId}/calls`]] : []),
];

function shape(value, depth = 0) {
  if (depth > 2) return typeof value;
  if (Array.isArray(value)) return { kind: 'array', length: value.length, item: value.length ? shape(value[0], depth + 1) : null };
  if (!value || typeof value !== 'object') return typeof value;
  return { kind: 'object', keys: Object.keys(value).sort(), fields: Object.fromEntries(
    Object.entries(value).slice(0, 20).map(([key, nested]) => [key, shape(nested, depth + 1)]),
  ) };
}

for (const [name, path] of checks) {
  let response;
  let error;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      response = await fetch(base + path, { headers: { Accept: 'application/json', Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(60_000) });
      break;
    } catch (reason) {
      error = reason;
      await new Promise((resolve) => setTimeout(resolve, attempt * 300));
    }
  }
  if (!response) {
    console.log(JSON.stringify({ name, networkError: error instanceof Error ? error.message : 'unknown' }));
    continue;
  }
  const body = await response.json().catch(() => null);
  console.log(JSON.stringify({ name, status: response.status, shape: shape(body) }));
}
