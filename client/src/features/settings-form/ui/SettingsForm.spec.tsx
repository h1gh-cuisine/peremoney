import { renderToStaticMarkup } from 'react-dom/server';
import { useAccessStore } from '@/entities/access';
import { SettingsForm } from './SettingsForm';

jest.mock('@/entities/access', () => {
  const actual = jest.requireActual('@/entities/access');
  return { ...actual, useAccessStore: jest.fn() };
});

const accessState = {
  accessLevel: 'full',
  draftSectionVisibility: { contacts: true, sources: true, script: true, finance: true, settings: true },
  setDraftSectionVisibility: jest.fn(),
  commitVisibilityDraft: jest.fn(),
};

const mockAccessLevel = (accessLevel: 'full' | 'limited') => {
  accessState.accessLevel = accessLevel;
  (useAccessStore as unknown as jest.Mock).mockImplementation((selector: (state: typeof accessState) => unknown) => selector(accessState));
};

describe('Settings UI RBAC', () => {
  afterEach(() => jest.clearAllMocks());

  it('LIMITED sees no project/access controls or save action', () => {
    mockAccessLevel('limited');
    const html = renderToStaticMarkup(<SettingsForm />);

    expect(html).toContain('Настройки доступны только для просмотра');
    expect(html).not.toContain('Сохранить настройки');
    expect(html).not.toContain('Управление доступом');
    expect(html).not.toMatch(/<(button|input|select)\b/);
  });

  it('FULL retains project/access controls and save action', () => {
    mockAccessLevel('full');
    const html = renderToStaticMarkup(<SettingsForm />);

    expect(html).toContain('Сохранить настройки');
    expect(html).toContain('Управление доступом');
    expect(html).toContain('Telegram');
    expect(html).toContain('MAX');
    expect(html).not.toContain('Bitrix24');
    expect(html).not.toContain('AmoCRM');
    expect(html).not.toContain('Email');
  });
});
