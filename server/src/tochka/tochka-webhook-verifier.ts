import { createPublicKey, JsonWebKey, KeyObject, verify as verifySignature } from 'node:crypto';
import { UnauthorizedException } from '@nestjs/common';

export class TochkaWebhookVerifier {
  private readonly key: KeyObject;

  constructor(key: KeyObject | string | JsonWebKey) {
    this.key = key instanceof KeyObject ? key : createPublicKey(typeof key === 'string' ? key : { key, format: 'jwk' });
  }

  verify(token: string): Record<string, unknown> {
    const parts = token.trim().split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Некорректный webhook Точки');
    let header: { alg?: string };
    try { header = JSON.parse(Buffer.from(parts[0]!, 'base64url').toString()); }
    catch { throw new UnauthorizedException('Некорректный webhook Точки'); }
    if (header.alg !== 'RS256') throw new UnauthorizedException('Некорректный алгоритм webhook Точки');
    const valid = verifySignature('RSA-SHA256', Buffer.from(`${parts[0]}.${parts[1]}`), this.key, Buffer.from(parts[2]!, 'base64url'));
    if (!valid) throw new UnauthorizedException('Некорректная подпись webhook Точки');
    try { return JSON.parse(Buffer.from(parts[1]!, 'base64url').toString()) as Record<string, unknown>; }
    catch { throw new UnauthorizedException('Некорректный webhook Точки'); }
  }
}
