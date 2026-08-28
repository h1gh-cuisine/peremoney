import { mapCabinetSettings, scheduleToApi, visibilityToApi } from './cabinet-settings-api';

describe('cabinet settings API contract', () => {
  it('maps cabinet schedule, status and project type', () => {
    expect(mapCabinetSettings({ isActive: false, schedulePreset: 'WEEKENDS', type: 'NUMBERS' }))
      .toEqual({ status: 'paused', schedulePreset: 'weekends', scheduleDays: [1, 2, 3, 4, 5, 6, 7], projectType: 'numbers', timezoneOffset: 3,
        uploadsEnabled: true, callsEnabled: true, crmIntegration: '', messengerIntegrations: [] });
  });
  it('drops integrations that Peremoney no longer supports', () => {
    expect(mapCabinetSettings({ isActive: true, schedulePreset: 'EVERYDAY', type: 'VDL',
      messengerIntegrations: ['telegram', 'whatsapp', 'viber', 'max', 'email'] }).messengerIntegrations)
      .toEqual(['telegram', 'max']);
  });
  it('maps schedule and visibility to backend DTO enums/keys', () => {
    expect(scheduleToApi('weekdays')).toEqual({ schedulePreset: 'WEEKDAYS' });
    expect(visibilityToApi({ contacts: true, sources: false, script: true, finance: false, settings: true }))
      .toEqual({ contacts: true, sources: false, script: true, finance: false, settings: true });
  });
});
