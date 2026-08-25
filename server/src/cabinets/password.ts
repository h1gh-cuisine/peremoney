import { randomBytes } from 'node:crypto';

export function generatePassword(): string {
  return `${randomBytes(12).toString('base64url')}Aa1!`;
}
