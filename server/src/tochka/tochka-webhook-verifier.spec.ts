import { generateKeyPairSync, sign } from 'node:crypto';
import { TochkaWebhookVerifier } from './tochka-webhook-verifier';

const b64 = (value: string | Buffer) => Buffer.from(value).toString('base64url');

describe('TochkaWebhookVerifier', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const payload = { paymentId: 'bank-1', webhookType: 'incomingPayment' };
  const signed = () => {
    const input = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify(payload))}`;
    return `${input}.${sign('RSA-SHA256', Buffer.from(input), privateKey).toString('base64url')}`;
  };

  it('accepts a valid RS256 signature', () => {
    expect(new TochkaWebhookVerifier(publicKey).verify(signed())).toEqual(payload);
  });

  it('rejects tampering and non-RS256 algorithms', () => {
    const verifier = new TochkaWebhookVerifier(publicKey);
    expect(() => verifier.verify(`${signed()}x`)).toThrow('Некорректная подпись webhook Точки');
    expect(() => verifier.verify(`${b64(JSON.stringify({ alg: 'none' }))}.${b64('{}')}.`)).toThrow('Некорректный алгоритм webhook Точки');
  });
});
