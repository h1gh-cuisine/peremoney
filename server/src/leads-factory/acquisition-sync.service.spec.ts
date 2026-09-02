import { Prisma } from '@prisma/client';
import { AcquisitionSyncService } from './acquisition-sync.service';

describe('AcquisitionSyncService', () => {
  const flags = {
    check_domains_in_v_kazakh: true, parse_domains: true, parse_phones: false, parse_ishod: true,
    parse_ceo: false, parse_google: true, parse_manual: false, parse_maps: true,
  };

  it('captures the current acquisition flags before turning them all off, only if not already captured', async () => {
    const findUniqueOrThrow = jest.fn().mockResolvedValue({ uploadsAcquisitionSnapshot: null });
    const update = jest.fn();
    const getAcquisitionFlags = jest.fn().mockResolvedValue(flags);
    const updateAcquisitionFlags = jest.fn();
    const service = new AcquisitionSyncService(
      { cabinet: { findUniqueOrThrow, update } } as never,
      { getAcquisitionFlags, updateAcquisitionFlags } as never,
    );

    await service.reconcile('cabinet-id', 42, false);

    expect(getAcquisitionFlags).toHaveBeenCalledWith(42);
    expect(update).toHaveBeenCalledWith({ where: { id: 'cabinet-id' }, data: { uploadsAcquisitionSnapshot: flags } });
    expect(updateAcquisitionFlags).toHaveBeenCalledWith(42, expect.objectContaining({
      check_domains_in_v_kazakh: false, parse_domains: false, parse_phones: false, parse_ishod: false,
      parse_ceo: false, parse_google: false, parse_manual: false, parse_maps: false,
    }));
  });

  it('does not re-capture a snapshot that already exists (idempotent retry)', async () => {
    const findUniqueOrThrow = jest.fn().mockResolvedValue({ uploadsAcquisitionSnapshot: flags });
    const update = jest.fn();
    const getAcquisitionFlags = jest.fn();
    const updateAcquisitionFlags = jest.fn();
    const service = new AcquisitionSyncService(
      { cabinet: { findUniqueOrThrow, update } } as never,
      { getAcquisitionFlags, updateAcquisitionFlags } as never,
    );

    await service.reconcile('cabinet-id', 42, false);

    expect(getAcquisitionFlags).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
    expect(updateAcquisitionFlags).toHaveBeenCalledWith(42, expect.objectContaining({ parse_domains: false }));
  });

  it('restores the captured flags and clears the snapshot when uploads is turned back on', async () => {
    const findUniqueOrThrow = jest.fn().mockResolvedValue({ uploadsAcquisitionSnapshot: flags });
    const update = jest.fn();
    const updateAcquisitionFlags = jest.fn();
    const service = new AcquisitionSyncService(
      { cabinet: { findUniqueOrThrow, update } } as never,
      { updateAcquisitionFlags } as never,
    );

    await service.reconcile('cabinet-id', 42, true);

    expect(updateAcquisitionFlags).toHaveBeenCalledWith(42, flags);
    expect(update).toHaveBeenCalledWith({ where: { id: 'cabinet-id' }, data: { uploadsAcquisitionSnapshot: Prisma.JsonNull } });
  });

  it('does nothing when turning uploads on with no pending snapshot (already in sync)', async () => {
    const findUniqueOrThrow = jest.fn().mockResolvedValue({ uploadsAcquisitionSnapshot: null });
    const update = jest.fn();
    const updateAcquisitionFlags = jest.fn();
    const service = new AcquisitionSyncService(
      { cabinet: { findUniqueOrThrow, update } } as never,
      { updateAcquisitionFlags } as never,
    );

    await service.reconcile('cabinet-id', 42, true);

    expect(updateAcquisitionFlags).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
