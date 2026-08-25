import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PaymentStatus, ProjectType, UserRole } from '@prisma/client';
import { hash } from 'bcryptjs';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TochkaService } from '../src/tochka/tochka.service';
import { LeadsFactoryService } from '../src/leads-factory/leads-factory.service';

describe('core API PostgreSQL integration', () => {
  const marker = randomUUID();
  const login = `master-${marker}`;
  const password = 'IntegrationPassword123!';
  let app: INestApplication;
  let prisma: PrismaService;
  let cabinetId = '';
  let masterId = '';
  const webhookKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });

  beforeAll(async () => {
    process.env.JWT_SECRET = 'integration-secret-at-least-32-characters';
    process.env.TOCHKA_WEBHOOK_PUBLIC_KEY = webhookKeys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(TochkaService).useValue({ customerCode: () => 'test-customer', accountId: () => 'test-account',
        createInvoice: jest.fn().mockResolvedValue('tochka-document-1'), getInvoicePdf: jest.fn().mockResolvedValue(Buffer.from('%PDF-test')) })
      .overrideProvider(LeadsFactoryService).useValue({
        updateProjectSchedule: jest.fn().mockResolvedValue({ ok: true }),
        getAnswers: jest.fn().mockResolvedValue({ items: [], total: 0 }),
        getTags: jest.fn().mockResolvedValue({ items: [], total: 0 }),
        getProjectScript: jest.fn().mockResolvedValue({ name: '', script: '', script_lvl: 0 }),
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);
    const master = await prisma.user.create({ data: { login, passwordHash: await hash(password, 4), role: UserRole.MASTER } });
    masterId = master.id;
  });

  afterAll(async () => {
    await prisma.tochkaWebhookEvent.deleteMany({ where: { externalId: `bank-${marker}` } }).catch(() => undefined);
    if (cabinetId) await prisma.cabinet.delete({ where: { id: cabinetId } }).catch(() => undefined);
    if (masterId) await prisma.user.delete({ where: { id: masterId } }).catch(() => undefined);
    await app.close();
  });

  it('runs auth → cabinet → settings → invoice → paid balance through HTTP', async () => {
    await request(app.getHttpServer()).get('/api/health/ready').expect(200).expect({ status: 'ready', database: 'up' });
    const auth = await request(app.getHttpServer()).post('/api/auth/login').send({ login, password }).expect(201);
    const bearer = `Bearer ${auth.body.accessToken}`;
    const created = await request(app.getHttpServer()).post('/api/cabinets').set('Authorization', bearer).send({
      name: `integration-${marker}`, type: ProjectType.VDL, price: 250, providerProjectId: 1,
      managerName: 'Integration', sphere: 'Tests', employeeLogin: `staff-${marker}`, clientLogin: `client-${marker}`,
    }).expect(201);
    cabinetId = created.body.cabinet.id;
    expect(created.body.credentials.client.password).toBeTruthy();

    await request(app.getHttpServer()).patch(`/api/cabinets/${cabinetId}/settings`).set('Authorization', bearer).send({
      isActive: true, timezoneOffset: 4, uploadsEnabled: true, callsEnabled: false, schedulePreset: 'WEEKDAYS',
      crmIntegration: 'bitrix', messengerIntegrations: ['telegram', 'max'], contacts: true, sources: true,
      script: true, finance: true, settings: true,
    }).expect(200);
    await request(app.getHttpServer()).put(`/api/cabinets/${cabinetId}/payer`).set('Authorization', bearer)
      .send({ data: { organizationName: 'ООО Integration', inn: '1234567890', kpp: '123456789' } }).expect(200);
    const invoice = await request(app.getHttpServer()).post(`/api/cabinets/${cabinetId}/finance/invoices`)
      .set('Authorization', bearer).send({ quantity: 4, idempotencyKey: randomUUID() }).expect(201);
    expect(Number(invoice.body.payment.amount)).toBe(1000);
    expect(invoice.body.payment.tochkaDocumentId).toBe('tochka-document-1');
    await request(app.getHttpServer()).get(`/api/cabinets/${cabinetId}/finance/invoices/${invoice.body.payment.id}/pdf`)
      .set('Authorization', bearer).expect(200).expect('Content-Type', /application\/pdf/);
    const bankEvent = { paymentId: `bank-${marker}`, webhookType: 'incomingPayment', purpose: `Оплата счета №${invoice.body.payment.invoiceNo}`,
      date: '2026-08-21', SidePayer: { inn: '1234567890', amount: '1000.00', currency: 'RUB', name: 'ООО Integration' } };
    const encoded = (value: unknown) => Buffer.from(JSON.stringify(value)).toString('base64url');
    const signingInput = `${encoded({ alg: 'RS256', typ: 'JWT' })}.${encoded(bankEvent)}`;
    const webhookJwt = `${signingInput}.${sign('RSA-SHA256', Buffer.from(signingInput), webhookKeys.privateKey).toString('base64url')}`;
    await request(app.getHttpServer()).post('/api/webhooks/tochka').set('Content-Type', 'text/plain').send(webhookJwt)
      .expect(201).expect({ ok: true, status: 'matched' });
    await request(app.getHttpServer()).post('/api/webhooks/tochka').set('Content-Type', 'text/plain').send(webhookJwt)
      .expect(201).expect({ ok: true, status: 'duplicate' });
    const summary = await request(app.getHttpServer()).get(`/api/cabinets/${cabinetId}/finance/summary`)
      .set('Authorization', bearer).expect(200);
    expect(Number(summary.body.moneyBalance)).toBe(1000);
    expect(summary.body.totalUnits).toBe(4);
    expect(await prisma.tochkaWebhookEvent.count({ where: { externalId: `bank-${marker}` } })).toBe(1);
  });

  it('credits a payment only once under concurrent status updates', async () => {
    const cabinet = await prisma.cabinet.create({ data: {
      name: `payment-race-${marker}`, type: ProjectType.VDL, price: 250,
    } });
    try {
      const payment = await prisma.payment.create({ data: {
        cabinetId: cabinet.id, invoiceNo: `race-${marker}`, quantity: 10, unitPrice: 250,
        amount: 2500, projectType: ProjectType.VDL,
      } });
      const finance = new (await import('../src/finance/finance.service')).FinanceService(prisma);
      await Promise.all(Array.from({ length: 10 }, () => finance.setPaymentStatus(payment.id, PaymentStatus.PAID)));
      const updated = await prisma.cabinet.findUniqueOrThrow({ where: { id: cabinet.id } });
      expect(Number(updated.moneyBalance)).toBe(2500);
      expect(updated.totalUnits).toBe(10);
      expect(await prisma.balanceEntry.count({ where: { paymentId: payment.id, type: 'PAYMENT' } })).toBe(1);
    } finally {
      await prisma.cabinet.delete({ where: { id: cabinet.id } }).catch(() => undefined);
    }
  });
});
