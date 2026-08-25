import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class TochkaApiException extends BadGatewayException {
  constructor(public readonly providerStatus: number, public readonly providerDetails?: unknown) {
    super({ message: `Точка API: запрос отклонён (${providerStatus})`, providerStatus, providerDetails });
  }
}

@Injectable()
export class TochkaService {
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

  private async request(path: string, init: RequestInit): Promise<Response> {
    const token = this.required('TOCHKA_JWT');
    const base = this.config.get<string>('TOCHKA_API_BASE_URL') ?? 'https://enter.tochka.com/uapi';
    let response: Response;
    try {
      response = await fetch(`${base.replace(/\/$/, '')}${path}`, {
        ...init,
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined) },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new ServiceUnavailableException('Точка API временно недоступен');
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
