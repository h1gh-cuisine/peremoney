import { renderToStaticMarkup } from 'react-dom/server';
import { useAccessStore } from '@/entities/access';
import { useSessionStore } from '@/entities/session';
import { RoleSwitcher } from './RoleSwitcher';

jest.mock('@/entities/access', () => ({ useAccessStore: jest.fn() }));
jest.mock('@/entities/session', () => ({ useSessionStore: jest.fn() }));

const accessState = {
  accessLevel: 'full',
  setAccessLevel: jest.fn(),
};

function renderForRole(role: 'MASTER' | 'FULL' | 'LIMITED') {
  (useSessionStore as unknown as jest.Mock).mockImplementation(
    (selector: (state: { user: { role: typeof role } }) => unknown) => selector({ user: { role } }),
  );
  (useAccessStore as unknown as jest.Mock).mockImplementation(
    (selector: (state: typeof accessState) => unknown) => selector(accessState),
  );
  return renderToStaticMarkup(<RoleSwitcher />);
}

describe('RoleSwitcher', () => {
  afterEach(() => jest.clearAllMocks());

  it('is hidden in the master cabinet', () => {
    expect(renderForRole('MASTER')).toBe('');
  });

  it('is available to a full-access cabinet employee', () => {
    expect(renderForRole('FULL')).toContain('Просмотр как');
  });

  it('is hidden from a limited client', () => {
    expect(renderForRole('LIMITED')).toBe('');
  });
});
