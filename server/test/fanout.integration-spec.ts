import { ProjectType } from '@prisma/client';
import { hash } from 'bcryptjs';
import { randomUUID } from 'node:crypto';
import { FanoutService } from '../src/fanout/fanout.service';
import { FinanceService } from '../src/finance/finance.service';
import { PrismaService } from '../src/prisma/prisma.service';

describe('fan-out PostgreSQL integration', () => {
  const prisma = new PrismaService();
  const marker = randomUUID();
  const token = `token-${marker}`;
  let sourceId: string;
  let publicId: string;
  const cabinetIds: string[] = [];

  beforeAll(async () => {
    await prisma.$connect();
    for (const suffix of ['a', 'b']) {
      const cabinet = await prisma.cabinet.create({ data: {
        name: `fanout-test-${marker}-${suffix}`, type: ProjectType.VDL, price: 100,
      } });
      cabinetIds.push(cabinet.id);
    }
    publicId = `test-${marker}`;
    const source = await prisma.fanoutSource.create({ data: {
      publicId, name: `test-${marker}`, tokenHash: await hash(token, 4),
    } });
    sourceId = source.id;
  });

  afterAll(async () => {
    if (sourceId) await prisma.fanoutSource.delete({ where: { id: sourceId } }).catch(() => undefined);
    if (cabinetIds.length) await prisma.cabinet.deleteMany({ where: { id: { in: cabinetIds } } });
    await prisma.$disconnect();
  });

  it('delivers once to every linked cabinet and deduplicates a repeated externalId', async () => {
    const service = new FanoutService(prisma, new FinanceService(prisma));
    await service.setDestinations(sourceId, cabinetIds);
    const dto = {
      externalId: `lead-${marker}`, date: '2026-08-20T10:00:00.000Z',
      mobileTel: '79990000000', name: 'Integration lead', site: 'test-source',
    };

    const first = await service.ingest(publicId, token, dto);
    const repeated = await service.ingest(publicId, token, dto);

    expect(first.duplicate).toBe(false);
    expect(repeated.duplicate).toBe(true);
    expect(await prisma.incomingLead.count({ where: { sourceId, externalId: dto.externalId } })).toBe(1);
    expect(await prisma.fanoutDelivery.count({ where: { incomingLeadId: first.incomingLeadId } })).toBe(2);
    expect(await prisma.contact.count({ where: { fanoutDelivery: { incomingLeadId: first.incomingLeadId } } })).toBe(2);
    expect(await prisma.lead.count({ where: { contact: { fanoutDelivery: { incomingLeadId: first.incomingLeadId } } } })).toBe(2);
  });

  it('delivers exactly once under concurrent duplicate requests', async () => {
    const service = new FanoutService(prisma, new FinanceService(prisma));
    await service.setDestinations(sourceId, cabinetIds);
    const externalId = `concurrent-${marker}`;
    const dto = {
      externalId, date: '2026-08-20T10:00:00.000Z', mobileTel: '79991112233',
      name: 'Concurrent integration lead', site: 'test-source',
    };
    await Promise.all(Array.from({ length: 8 }, () => service.ingest(publicId, token, dto)));
    const incoming = await prisma.incomingLead.findUniqueOrThrow({
      where: { sourceId_externalId: { sourceId, externalId } },
    });
    expect(await prisma.fanoutDelivery.count({ where: { incomingLeadId: incoming.id } })).toBe(2);
    expect(await prisma.contact.count({ where: { fanoutDelivery: { incomingLeadId: incoming.id } } })).toBe(2);
    expect(await prisma.lead.count({ where: { contact: { fanoutDelivery: { incomingLeadId: incoming.id } } } })).toBe(2);
  });
});
