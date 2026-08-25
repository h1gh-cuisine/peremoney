import { randomUUID } from 'node:crypto';
export function resolveRequestId(value: unknown) { return typeof value === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(value) ? value : randomUUID(); }
