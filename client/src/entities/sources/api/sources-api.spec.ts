import { apiClient } from '@/shared/api';
import { automationToApi, buildSourcesQuery, fetchAutomation, mapSourceFromApi, normalizeTagTypes, sourceDisplayName } from './sources-api';

jest.mock('@/shared/api', () => ({ apiClient: jest.fn() }));

describe('sources API contract', () => {
  it('reads saved automation thresholds from their own dedicated endpoint', async () => {
    const get = jest.fn().mockResolvedValue({ autoCleanupEnabled: true, minContactsPerLead: 5, autoManageEnabled: false, minConversion: 15 });
    (apiClient as jest.Mock).mockReturnValue({ get });

    await expect(fetchAutomation('cab-1')).resolves.toEqual({
      autoCleanupEnabled: true, minContactsPerLead: 5, autoManageEnabled: false, minConversion: 15,
    });
    expect(get).toHaveBeenCalledWith('/cabinets/cab-1/sources/automation/settings');
  });

  it('maps Prisma source fields and calculated metrics to the UI model', () => {
    expect(mapSourceFromApi({ id: 's1', name: 'site.ru', operator: null, newAnswer: 12, success: 3,
      conversion: '25.0000', sebes: '140.50', notTargetShare: 75, sales: 2, normWork: true, sourceType: null }))
      .toEqual({ id: 's1', name: 'site.ru', operator: '', contacts: 12, leads: 3, conversion: 25,
        cost: 140.5, notRelevantShare: 75, sales: 2, active: true, sourceType: 'phone' });
  });

  it('always removes Leads Factory technical prefix and suffix from source names', () => {
    expect(sourceDisplayName('B222_79661569662_26013')).toBe('79661569662');
    expect(sourceDisplayName('B222\\_79661569662\\_26013')).toBe('79661569662');
    expect(sourceDisplayName('B320_example.com_093209')).toBe('example.com');
  });

  it('sends the applied period with inclusive calendar dates', () => {
    expect(buildSourcesQuery({ from: '2026-06-01', to: '2026-08-20' })).toBe('?dateFrom=2026-06-01&dateTo=2026-08-20');
  });

  it('maps UI automation naming to backend DTO naming', () => {
    expect(automationToApi({ autoCleanupEnabled: true, minContactsPerLead: 4, autoManageEnabled: true, minConversion: 20 }))
      .toEqual({ autoCleanupEnabled: true, minContactsPerLead: 4, autoManagementEnabled: true, minConversion: 20 });
  });
  it('normalizes provider tag type response variants and removes duplicates', () => {
    expect(normalizeTagTypes({ types: ['B221', 'B444', 'B221'] })).toEqual(['B221', 'B444']);
    expect(normalizeTagTypes({ items: [{ name: 'VIP' }, { label: 'Горячий' }] })).toEqual([]);
    expect(normalizeTagTypes(['Обычный'])).toEqual([]);
  });
});
