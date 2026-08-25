import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { FanoutDeliveryStatus } from '@prisma/client';
import { FanoutService } from './fanout.service';

describe('fan-out: бизнес-правила 2.2', () => {
  it('создаёт many-to-many связи источника только с существующими кабинетами', async () => {
    const tx = {
      cabinet: { count: jest.fn().mockResolvedValue(2) },
      fanoutDestination: { deleteMany: jest.fn(), createMany: jest.fn() },
      fanoutSource: { update: jest.fn().mockResolvedValue({ id: 'source' }) },
    };
    const service = new FanoutService({ $transaction: (cb: (value: unknown) => unknown) => cb(tx) } as never, {} as never);
    await service.setDestinations('source', ['cab-1', 'cab-2']);
    expect(tx.fanoutDestination.createMany).toHaveBeenCalledWith({ data: [
      { sourceId: 'source', cabinetId: 'cab-1' }, { sourceId: 'source', cabinetId: 'cab-2' },
    ], skipDuplicates: true });
  });

  it('отклоняет неверный токен до создания лида', async () => {
    const prisma = { fanoutSource: { findUnique: jest.fn().mockResolvedValue({ tokenHash: 'hash', isActive: true }) } };
    const service = new FanoutService(prisma as never, { chargeUsage: jest.fn() } as never);
    await expect(service.ingest('public', 'wrong', { externalId: 'lead-1', date: '2026-08-20T10:00:00Z', mobileTel: '79990000000' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('повтор externalId возвращает тот же incoming lead и не создаёт новые delivery', async () => {
    const existing = { id: 'incoming', deliveries: [{ id: 'delivery', status: FanoutDeliveryStatus.COMPLETED }] };
    const prisma = {
      fanoutSource: { findUnique: jest.fn().mockResolvedValue({ id: 'source', tokenHash: '$2b$04$abcdefghijklmnopqrstuuuuuuuuuuuuuuuuuuuuuuuuuuuu', isActive: true }) },
      incomingLead: { findUnique: jest.fn().mockResolvedValue(existing) },
      fanoutDelivery: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new FanoutService(prisma as never, {} as never);
    jest.spyOn(service, 'tokenMatches').mockResolvedValue(true);
    const result = await service.ingest('public', 'token', { externalId: 'lead-1', date: '2026-08-20T10:00:00Z', mobileTel: '79990000000' });
    expect(result).toMatchObject({ duplicate: true, incomingLeadId: 'incoming' });
  });

  it('ошибка одного кабинета фиксируется и не мешает следующей доставке', async () => {
    const updates: unknown[] = [];
    const prisma = {
      fanoutDelivery: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'd1', cabinetId: 'bad', incomingLead: { id: 'in', date: new Date(), mobileTel: '1', name: null, site: null, mobileOperator: null } },
          { id: 'd2', cabinetId: 'good', incomingLead: { id: 'in', date: new Date(), mobileTel: '1', name: null, site: null, mobileOperator: null } },
        ]),
        update: jest.fn().mockImplementation((value) => { updates.push(value); }),
      },
      $transaction: jest.fn().mockRejectedValueOnce(new Error('cabinet failed')).mockResolvedValueOnce(true),
    };
    const service = new FanoutService(prisma as never, {} as never);
    await service.deliverPending('in');
    expect(updates).toEqual(expect.arrayContaining([
      expect.objectContaining({ where: { id: 'd1' }, data: expect.objectContaining({ status: FanoutDeliveryStatus.FAILED }) }),
      expect.objectContaining({ where: { id: 'd2' }, data: expect.objectContaining({ status: FanoutDeliveryStatus.COMPLETED }) }),
    ]));
  });

  it('не принимает лид для неизвестного источника', async () => {
    const service = new FanoutService({ fanoutSource: { findUnique: jest.fn().mockResolvedValue(null) } } as never, {} as never);
    await expect(service.ingest('missing', 'token', { externalId: '1', date: '2026-08-20T10:00:00Z', mobileTel: '1' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});
