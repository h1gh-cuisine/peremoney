import { useSessionStore, SESSION_STORAGE_KEY } from './useSessionStore';

describe('session store', () => {
  beforeEach(() => useSessionStore.setState({ token: null, user: null, hydrated: false }));

  it('сохраняет login-сессию в storage', () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
    const session = { token: 'jwt', user: { id: 'u', login: 'x', role: 'FULL' as const, cabinetId: 'cab' } };
    useSessionStore.getState().setSession(session, storage);
    expect(storage.setItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY, JSON.stringify(session));
    expect(useSessionStore.getState()).toMatchObject(session);
  });

  it('восстанавливает валидную сессию и завершает hydration', () => {
    const session = { token: 'jwt', user: { id: 'u', login: 'x', role: 'LIMITED', cabinetId: 'cab' } };
    const storage = { getItem: jest.fn().mockReturnValue(JSON.stringify(session)), setItem: jest.fn(), removeItem: jest.fn() };
    useSessionStore.getState().hydrate(storage);
    expect(useSessionStore.getState()).toMatchObject({ ...session, hydrated: true });
  });

  it('очищает повреждённую и выходящую сессию', () => {
    const storage = { getItem: jest.fn().mockReturnValue('{bad'), setItem: jest.fn(), removeItem: jest.fn() };
    useSessionStore.getState().hydrate(storage);
    expect(storage.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    useSessionStore.getState().logout(storage);
    expect(useSessionStore.getState()).toMatchObject({ token: null, user: null, hydrated: true });
  });
});
