import { create } from 'zustand';
import type { SessionData, SessionUser } from './session';

export const SESSION_STORAGE_KEY = 'peremoney.session';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface SessionState {
  token: string | null;
  user: SessionUser | null;
  hydrated: boolean;
  setSession(session: SessionData, storage?: StorageLike): void;
  hydrate(storage?: StorageLike): void;
  logout(storage?: StorageLike): void;
}

const browserStorage = () => typeof window === 'undefined' ? undefined : window.localStorage;

function validSession(value: unknown): value is SessionData {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SessionData>;
  return typeof candidate.token === 'string' && Boolean(candidate.user)
    && typeof candidate.user?.id === 'string' && typeof candidate.user.login === 'string'
    && ['MASTER', 'FULL', 'LIMITED'].includes(candidate.user.role);
}

export const useSessionStore = create<SessionState>((set) => ({
  token: null, user: null, hydrated: false,
  setSession: (session, storage = browserStorage()) => {
    storage?.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    set({ ...session, hydrated: true });
  },
  hydrate: (storage = browserStorage()) => {
    try {
      const raw = storage?.getItem(SESSION_STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (validSession(parsed)) set({ ...parsed, hydrated: true });
      else {
        if (raw) storage?.removeItem(SESSION_STORAGE_KEY);
        set({ token: null, user: null, hydrated: true });
      }
    } catch {
      storage?.removeItem(SESSION_STORAGE_KEY);
      set({ token: null, user: null, hydrated: true });
    }
  },
  logout: (storage = browserStorage()) => {
    storage?.removeItem(SESSION_STORAGE_KEY);
    set({ token: null, user: null, hydrated: true });
  },
}));
