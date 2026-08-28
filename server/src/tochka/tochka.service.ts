import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { rootCertificates } from 'node:tls';
import { Agent } from 'undici';
import { RUSSIAN_TRUSTED_ROOT_CA } from './russian-trusted-root-ca';

export class TochkaApiException extends BadGatewayException {
  constructor(public readonly providerStatus: number, public readonly providerDetails?: unknown) {
    super({ message: `Точка API: запрос отклонён (${providerStatus})`, providerStatus, providerDetails });
  }
}

export class TochkaTransportException extends ServiceUnavailableException {
  constructor(
    public readonly transportCode: string,
    public readonly ambiguous: boolean,
  ) {
    const certificateError = transportCode === 'SELF_SIGNED_CERT_IN_CHAIN'
      || transportCode === 'DEPTH_ZERO_SELF_SIGNED_CERT'
      || transportCode === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE'
      || transportCode === 'CERT_HAS_EXPIRED';
    super({
      message: certificateError
        ? 'Не удалось проверить TLS-сертификат Точки. Добавьте корневой сертификат VPN/прокси через NODE_EXTRA_CA_CERTS или отключите перехват HTTPS.'
        : 'Точка API временно недоступен',
      transportCode,
      retrySafe: !ambiguous,
    });
  }
}

@Injectable()
export class TochkaService {
  private readonly dispatcher = new Agent({
    connect: {
      // Preserve the normal Node trust store and add only the national CA used
      // by enter.tochka.com. TLS verification remains fully enabled.
      ca: [...rootCertificates, RUSSIAN_TRUSTED_ROOT_CA],
      family: 4,
    },
  });

  constructor(private readonly config: ConfigService) {}

  customerCode() { return this.required('TOCHKA_CUSTOMER_CODE'); }
  accountId() { return this.required('TOCHKA_ACCOUNT_ID'); }

  async createInvoice(payload: unknown): Promise<string> {
    const response = await this.request('/invoice/v1.0/bills', { method: 'POST', body: JSON.stringify(payload) });
    const result = await response.json() as { Data?: { documentId?: string } };
    if (!result.Data?.documentId) throw new BadGatewayException('Точка API: ответ не содержит documentId');
    return result.Data.documentId;
  }

  async getInvoicePdf(documentId: string): Promise<Buffer> {
    const response = await this.request(`/invoice/v1.0/bills/${encodeURIComponent(this.customerCode())}/${encodeURIComponent(documentId)}/file`, { method: 'GET', headers: { Accept: 'application/pdf' } });
    return Buffer.from(await response.arrayBuffer());
  }

  async getInvoicePaymentStatus(documentId: string): Promise<'payment_waiting' | 'payment_expired' | 'payment_paid'> {
    const response = await this.request(`/invoice/v1.0/bills/${encodeURIComponent(this.customerCode())}/${encodeURIComponent(documentId)}/payment-status`, { method: 'GET' });
    const result = await response.json() as { Data?: { paymentStatus?: string } };
    const status = result.Data?.paymentStatus;
    if (status !== 'payment_waiting' && status !== 'payment_expired' && status !== 'payment_paid') {
      throw new BadGatewayException('Точка API: ответ не содержит корректный статус счёта');
    }
    return status;
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const token = this.required('TOCHKA_JWT');
    const base = this.config.get<string>('TOCHKA_API_BASE_URL') ?? 'https://enter.tochka.com/uapi';
    let response: Response;
    try {
      response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
        ...init,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) },
        signal: AbortSignal.timeout(15_000),
        dispatcher: this.dispatcher,
      } as RequestInit & { dispatcher: Agent });
    } catch (error) {
      const transportCode = this.transportErrorCode(error);
      // DNS, TCP connect and certificate verification fail before the bank can
      // accept an invoice. A timeout/reset can happen after the request was sent.
      const definitelyNotSent = new Set([
        'ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH',
        'SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT',
        'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'CERT_HAS_EXPIRED',
      ]).has(transportCode);
      throw new TochkaTransportException(transportCode, !definitelyNotSent);
    }
    if (!response.ok) {
      const contentType = response.headers.get('content-type') ?? '';
      const raw = contentType.includes('json')
        ? await response.json().catch(() => undefined)
        : await response.text().catch(() => '');
      throw new TochkaApiException(response.status, this.safeProviderDetails(raw));
    }
    return response;
  }

  private transportErrorCode(error: unknown): string {
    if (!error || typeof error !== 'object') return 'NETWORK_ERROR';
    const value = error as { name?: unknown; code?: unknown; cause?: unknown };
    const cause = value.cause && typeof value.cause === 'object'
      ? value.cause as { code?: unknown; name?: unknown }
      : undefined;
    const code = cause?.code ?? value.code ?? cause?.name ?? value.name;
    return typeof code === 'string' && /^[A-Z0-9_]+$/.test(code) ? code : 'NETWORK_ERROR';
  }

  private required(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) throw new ServiceUnavailableException(`${name} не настроен`);
    return value;
  }

  private safeProviderDetails(value: unknown, depth = 0): unknown {
    if (depth > 5) return '[truncated]';
    if (typeof value === 'string') return value.slice(0, 2000);
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) return value;
    if (Array.isArray(value)) return value.slice(0, 50).map((item) => this.safeProviderDetails(item, depth + 1));
    if (!value || typeof value !== 'object') return undefined;
    const secret = /token|authorization|jwt|secret|password|signature/i;
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !secret.test(key))
      .slice(0, 50)
      .map(([key, item]) => [key, this.safeProviderDetails(item, depth + 1)]));
  }
}
