import { ConfigService } from '@nestjs/config';
import { TochkaService } from './tochka.service';

describe('TochkaService', () => {
  const config = { get: (key: string) => ({
    TOCHKA_JWT: 'secret', TOCHKA_CUSTOMER_CODE: 'customer', TOCHKA_ACCOUNT_ID: 'account',
    TOCHKA_API_BASE_URL: 'https://enter.tochka.com/uapi',
  } as Record<string, string>)[key] } as ConfigService;
  afterEach(() => jest.restoreAllMocks());

  it('creates an invoice and returns its documentId', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ Data: { documentId: 'doc-1' } }), { status: 200 }));
    const service = new TochkaService(config);
    await expect(service.createInvoice({ Data: {} })).resolves.toBe('doc-1');
    expect(fetchMock).toHaveBeenCalledWith('https://enter.tochka.com/uapi/invoice/v1.0/bills', expect.objectContaining({
      method: 'POST', headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
    }));
  });

  it('downloads a PDF without exposing the token to callers', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue(new Response(Buffer.from('%PDF'), { status: 200, headers: { 'content-type': 'application/pdf' } }));
    await expect(new TochkaService(config).getInvoicePdf('doc-1')).resolves.toEqual(Buffer.from('%PDF'));
    expect(fetchMock).toHaveBeenCalledWith('https://enter.tochka.com/uapi/invoice/v1.0/bills/customer/doc-1/file', expect.any(Object));
  });

  it('turns a provider failure into a safe error', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'invalid accountId', token: 'must-not-leak' }), {
      status: 400, headers: { 'content-type': 'application/json' },
    }));
    try {
      await new TochkaService(config).createInvoice({ Data: {} });
      throw new Error('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      const response = (error as { getResponse(): unknown }).getResponse();
      expect(response).toEqual({ message: 'Точка API: запрос отклонён (400)', providerStatus: 400,
        providerDetails: { error: 'invalid accountId' } });
      expect(JSON.stringify(response)).not.toContain('must-not-leak');
    }
  });

  it('reports a TLS interception error without hiding its actionable cause', async () => {
    const failure = new TypeError('fetch failed', { cause: Object.assign(new Error('private certificate data'), {
      code: 'SELF_SIGNED_CERT_IN_CHAIN',
    }) });
    jest.spyOn(global, 'fetch').mockRejectedValue(failure);
    try {
      await new TochkaService(config).createInvoice({ Data: {} });
      throw new Error('expected rejection');
    } catch (error) {
      const response = (error as { getResponse(): unknown }).getResponse();
      expect(response).toEqual(expect.objectContaining({
        transportCode: 'SELF_SIGNED_CERT_IN_CHAIN', retrySafe: true,
      }));
      expect(JSON.stringify(response)).not.toContain('private certificate data');
    }
  });
});
