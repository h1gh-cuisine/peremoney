import {
  useSessionStore, SESSION_STORAGE_KEY, MASTER_SESSION_STORAGE_KEY, CLIENT_SESSION_STORAGE_KEY,
} from './useSessionStore';

describe('session store', () => {
  beforeEach(() => useSessionStore.setState({
    token: null, user: null, masterSession: null, clientSession: null, activeScope: 'client', hydrated: false,
  }));

  it('сохраняет login-сессию в storage', () => {
    const storage = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
    const session = { token: 'jwt', user: { id: 'u', login: 'x', role: 'FULL' as const, cabinetId: 'cab' } };
    useSessionStore.getState().setSession(session, storage);
    expect(storage.setItem).toHaveBeenCalledWith(CLIENT_SESSION_STORAGE_KEY, JSON.stringify(session));
    expect(useSessionStore.getState()).toMatchObject(session);
  });

  it('восстанавливает валидную сессию и завершает hydration', () => {
    const session = { token: 'jwt', user: { id: 'u', login: 'x', role: 'LIMITED', cabinetId: 'cab' } };
    const storage = { getItem: jest.fn((key: string) => key === CLIENT_SESSION_STORAGE_KEY ? JSON.stringify(session) : null), setItem: jest.fn(), removeItem: jest.fn() };
    useSessionStore.getState().hydrate('client', storage);
    expect(useSessionStore.getState()).toMatchObject({ ...session, hydrated: true });
  });

  it('очищает повреждённую и выходящую сессию', () => {
    const storage = { getItem: jest.fn((key: string) => key === CLIENT_SESSION_STORAGE_KEY ? '{bad' : null), setItem: jest.fn(), removeItem: jest.fn() };
    useSessionStore.getState().hydrate('client', storage);
    expect(storage.removeItem).toHaveBeenCalledWith(CLIENT_SESSION_STORAGE_KEY);
    useSessionStore.getState().logout(storage);
    expect(useSessionStore.getState()).toMatchObject({ token: null, user: null, hydrated: true });
  });

  it('keeps master and client sessions independent and switches the active token', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: jest.fn((key: string) => values.get(key) ?? null),
      setItem: jest.fn((key: string, value: string) => { values.set(key, value); }),
      removeItem: jest.fn((key: string) => { values.delete(key); }),
    };
    const master = { token: 'master-jwt', user: { id: 'm', login: 'master', role: 'MASTER' as const, cabinetId: null } };
    const client = { token: 'client-jwt', user: { id: 'c', login: 'client', role: 'FULL' as const, cabinetId: 'cab' } };

    useSessionStore.getState().setSession(master, storage);
    useSessionStore.getState().setSession(client, storage);
    expect(values.has(MASTER_SESSION_STORAGE_KEY)).toBe(true);
    expect(values.has(CLIENT_SESSION_STORAGE_KEY)).toBe(true);
    expect(useSessionStore.getState()).toMatchObject({ token: 'client-jwt', masterSession: master, clientSession: client });

    useSessionStore.getState().activate('master');
    expect(useSessionStore.getState()).toMatchObject({ token: 'master-jwt', user: master.user, activeScope: 'master' });
    useSessionStore.getState().logout(storage);
    expect(values.has(MASTER_SESSION_STORAGE_KEY)).toBe(false);
    expect(values.has(CLIENT_SESSION_STORAGE_KEY)).toBe(true);
    expect(useSessionStore.getState().clientSession).toEqual(client);
  });

  it('migrates the legacy single session into its role-specific key', () => {
    const legacy = { token: 'legacy-master', user: { id: 'm', login: 'master', role: 'MASTER' as const, cabinetId: null } };
    const storage = {
      getItem: jest.fn((key: string) => key === SESSION_STORAGE_KEY ? JSON.stringify(legacy) : null),
      setItem: jest.fn(), removeItem: jest.fn(),
    };
    useSessionStore.getState().hydrate('master', storage);
    expect(storage.setItem).toHaveBeenCalledWith(MASTER_SESSION_STORAGE_KEY, JSON.stringify(legacy));
    expect(storage.removeItem).toHaveBeenCalledWith(SESSION_STORAGE_KEY);
    expect(useSessionStore.getState()).toMatchObject({ token: 'legacy-master', masterSession: legacy, activeScope: 'master' });
  });
});
