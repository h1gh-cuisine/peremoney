import { create } from 'zustand';
import type { SessionData, SessionUser } from './session';

/** Старый ключ читается только для бесшовной миграции существующей сессии. */
export const SESSION_STORAGE_KEY = 'peremoney.session';
export const MASTER_SESSION_STORAGE_KEY = 'peremoney.session.master';
export const CLIENT_SESSION_STORAGE_KEY = 'peremoney.session.client';
export type SessionScope = 'master' | 'client';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SessionState {
  token: string | null;
  user: SessionUser | null;
  masterSession: SessionData | null;
  clientSession: SessionData | null;
  activeScope: SessionScope;
  hydrated: boolean;
  setSession(session: SessionData, storage?: StorageLike): void;
  hydrate(scope?: SessionScope, storage?: StorageLike): void;
  activate(scope: SessionScope): void;
  logout(storage?: StorageLike): void;
}

const browserStorage = () => typeof window === 'undefined' ? undefined : window.localStorage;
const keyForScope = (scope: SessionScope) => scope === 'master' ? MASTER_SESSION_STORAGE_KEY : CLIENT_SESSION_STORAGE_KEY;
const scopeForSession = (session: SessionData): SessionScope => session.user.role === 'MASTER' ? 'master' : 'client';

function validSession(value: unknown): value is SessionData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SessionData>;
  return typeof candidate.token === 'string' && Boolean(candidate.user)
    && typeof candidate.user?.id === 'string' && typeof candidate.user.login === 'string'
    && ['MASTER', 'FULL', 'LIMITED'].includes(candidate.user.role);
}

function readSession(storage: StorageLike | undefined, key: string): SessionData | null {
  const raw = storage?.getItem(key);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (validSession(parsed)) return parsed;
  } catch { /* повреждённая сессия удаляется ниже */ }
  storage?.removeItem(key);
  return null;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  token: null, user: null, masterSession: null, clientSession: null, activeScope: 'client', hydrated: false,
  setSession: (session, storage = browserStorage()) => {
    const scope = scopeForSession(session);
    storage?.setItem(keyForScope(scope), JSON.stringify(session));
    storage?.removeItem(SESSION_STORAGE_KEY);
    set({
      [scope === 'master' ? 'masterSession' : 'clientSession']: session,
      activeScope: scope, token: session.token, user: session.user, hydrated: true,
    });
  },
  hydrate: (scope = 'client', storage = browserStorage()) => {
    let masterSession = readSession(storage, MASTER_SESSION_STORAGE_KEY);
    let clientSession = readSession(storage, CLIENT_SESSION_STORAGE_KEY);
    const legacySession = readSession(storage, SESSION_STORAGE_KEY);
    if (legacySession) {
      const legacyScope = scopeForSession(legacySession);
      storage?.setItem(keyForScope(legacyScope), JSON.stringify(legacySession));
      storage?.removeItem(SESSION_STORAGE_KEY);
      if (legacyScope === 'master') masterSession = masterSession ?? legacySession;
      else clientSession = clientSession ?? legacySession;
    }
    const active = scope === 'master' ? masterSession : clientSession;
    set({ masterSession, clientSession, activeScope: scope, token: active?.token ?? null, user: active?.user ?? null, hydrated: true });
  },
  activate: (scope) => {
    const session = scope === 'master' ? get().masterSession : get().clientSession;
    set({ activeScope: scope, token: session?.token ?? null, user: session?.user ?? null });
  },
  logout: (storage = browserStorage()) => {
    const scope = get().activeScope;
    storage?.removeItem(keyForScope(scope));
    if (scope === 'master') set({ masterSession: null, token: null, user: null, hydrated: true });
    else set({ clientSession: null, token: null, user: null, hydrated: true });
  },
}));
