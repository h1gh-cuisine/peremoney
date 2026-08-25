import { PrismaClient } from '@prisma/client';

const base = process.env.QA_API_URL ?? 'http://127.0.0.1:4010/api';
const prisma = new PrismaClient();
const marker = `qa-${Date.now()}`;
const results = [];
const createdCabinets = [];

function record(id, expected, actual, detail = '') {
  results.push({ id, status: expected === actual ? 'PASS' : 'FAIL', expected, actual, detail });
}
async function call(path, { token, method = 'GET', body } = {}) {
  const response = await fetch(`${base}${path}`, { method, headers: {
    ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}),
  }, body: body ? JSON.stringify(body) : undefined });
  const data = await response.json().catch(() => null);
  return { status: response.status, data };
}
async function login(loginValue, password) {
  return call('/auth/login', { method: 'POST', body: { login: loginValue, password } });
}

try {
  const masterAuth = await login('qa-master', 'QaPassword123!');
  record('AUTH-003', 201, masterAuth.status);
  const master = masterAuth.data?.accessToken;
  if (!master) throw new Error('QA master login failed');

  const credentials = [];
  for (let index = 1; index <= 2; index += 1) {
    const response = await call('/cabinets', { token: master, method: 'POST', body: {
      name: `${marker}-${index}`, type: 'VDL', price: 250, providerProjectId: 900000 + index,
      managerName: 'QA', sphere: 'Testing', employeeLogin: `${marker}-full-${index}`, clientLogin: `${marker}-limited-${index}`,
    } });
    record(`CAB-01.${index}`, 201, response.status);
    createdCabinets.push(response.data.cabinet.id);
    credentials.push(response.data.credentials);
  }
  const [cabinet1, cabinet2] = createdCabinets;
  const fullAuth = await login(credentials[0].employee.login, credentials[0].employee.password);
  const limitedAuth = await login(credentials[0].client.login, credentials[0].client.password);
  record('AUTH-001', 201, fullAuth.status);
  record('AUTH-002', 201, limitedAuth.status);
  const full = fullAuth.data.accessToken;
  const limited = limitedAuth.data.accessToken;

  record('AUTH-005', 401, (await call(`/cabinets/${cabinet1}/contacts`)).status);
  record('AUTH-006', 403, (await call(`/cabinets/${cabinet2}/contacts`, { token: limited })).status);
  record('AUTH-007', 403, (await call('/cabinets', { token: limited })).status);
  const own = await call('/cabinets/me', { token: limited });
  record('AUTH-002.context', cabinet1, own.data?.id);

  const contact = await prisma.contact.create({ data: {
    cabinetId: cabinet1, providerAnswerId: 990000001, date: new Date(), status: 'success', mobileTel: '+70000000001', site: 'qa',
  } });
  const lead = await prisma.lead.create({ data: { cabinetId: cabinet1, contactId: contact.id, successDate: new Date() } });
  record('AUTH-05/LIMITED-write', 403, (await call(`/cabinets/${cabinet1}/leads/${lead.id}`, {
    token: limited, method: 'PATCH', body: { feedback: 'limited must not write' },
  })).status, 'LIMITED must not edit leads');
  record('LEAD-005/FULL-write', 200, (await call(`/cabinets/${cabinet1}/leads/${lead.id}`, {
    token: full, method: 'PATCH', body: { feedback: 'full write' },
  })).status);

  record('NAV-004', 200, (await call(`/cabinets/${cabinet1}/visibility`, { token: full, method: 'PATCH', body: {
    contacts: false, sources: false, script: false, finance: false, settings: false,
  } })).status);
  record('NAV-006.contacts', 403, (await call(`/cabinets/${cabinet1}/contacts`, { token: limited })).status,
    'hidden section must be forbidden by API');
  record('NAV-006.finance', 403, (await call(`/cabinets/${cabinet1}/finance/payments`, { token: limited })).status,
    'hidden section must be forbidden by API');
  const payerUpdate = await call(`/cabinets/${cabinet1}/payer`, { token: limited, method: 'PUT', body: {
    data: { organizationName: 'ООО QA', inn: '6450000000', kpp: '645001001' },
  } });
  record('NAV-005/PAYER-002', 200, payerUpdate.status);

  const list = await call('/cabinets', { token: master });
  record('AUTH-011.passwordHash', false, JSON.stringify(list.data).includes('passwordHash'));
  const invalidProject = await call('/cabinets', { token: master, method: 'POST', body: {
    name: 'invalid', type: 'VDL', price: -1, employeeLogin: `${marker}-bad-full`, clientLogin: `${marker}-bad-client`,
  } });
  record('PROJ-007.negative-price', 400, invalidProject.status);
} finally {
  for (const id of createdCabinets) await prisma.cabinet.delete({ where: { id } }).catch(() => undefined);
  await prisma.$disconnect();
}

console.log(JSON.stringify({ summary: {
  total: results.length, passed: results.filter((item) => item.status === 'PASS').length,
  failed: results.filter((item) => item.status === 'FAIL').length,
}, results }, null, 2));
if (results.some((item) => item.status === 'FAIL')) process.exitCode = 1;
