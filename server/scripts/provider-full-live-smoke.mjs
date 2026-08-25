import { readFileSync } from 'node:fs';

for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
}

if (process.env.ENABLE_PROVIDER_MUTATIONS !== 'YES') {
  throw new Error('Set ENABLE_PROVIDER_MUTATIONS=YES to confirm the full live run');
}
if (!process.env.QA_PROVIDER_SOURCE) {
  throw new Error('Set QA_PROVIDER_SOURCE to a disposable test domain or phone; the provider has no delete endpoint');
}

const base = (process.env.LEADS_FACTORY_BASE_URL || 'https://openapi.leads-factory.ru/v1').replace(/\/$/, '');
const token = process.env.LEADS_FACTORY_TOKEN;
const projectId = process.env.QA_PROVIDER_PROJECT_ID || '26962';
if (!token) throw new Error('LEADS_FACTORY_TOKEN is not configured');

// Discover an answer so the read-only runner can exercise GET answer calls too.
if (!process.env.QA_PROVIDER_ANSWER_ID) {
  try {
    const response = await fetch(`${base}/crm/open-api/projects/${projectId}/answers?page=1&limit=1`, {
      headers: { Accept: 'application/json', Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(60_000),
    });
    const body = await response.json().catch(() => null);
    const answerId = body?.items?.[0]?.id;
    if (Number.isInteger(Number(answerId))) process.env.QA_PROVIDER_ANSWER_ID = String(answerId);
  } catch {
    // The regular runner below reports the provider/network result without secrets.
  }
}

console.log(JSON.stringify({ phase: 'read-only', projectId: Number(projectId) }));
await import('./provider-readonly-smoke.mjs');

if (!process.env.QA_PROVIDER_ANSWER_ID) {
  console.log(JSON.stringify({ name: 'answer-calls', skipped: 'The project has no answers; set QA_PROVIDER_ANSWER_ID from another QA project' }));
}

console.log(JSON.stringify({ phase: 'mutations', projectId: Number(projectId) }));
await import('./provider-mutation-smoke.mjs');
