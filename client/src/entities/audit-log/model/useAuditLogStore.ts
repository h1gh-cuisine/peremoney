import { create } from "zustand";
import { ApiError } from "@/shared/api";
import { fetchAuditLog } from "../api/audit-log-api";
import type { AuditLogEntry, AuditLogFilters } from "./types";

interface AuditLogState {
  entries: AuditLogEntry[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  filters: AuditLogFilters;
  /** Хранится только в памяти на время сессии — не персистится и не уходит в localStorage. */
  secret: string | null;
  unlocked: boolean;
  loading: boolean;
  error: string | null;
  unlock: (secret: string) => Promise<boolean>;
  lock: () => void;
  /** Меняет критерии фильтрации и сбрасывает страницу на первую. */
  setFilters: (filters: Partial<Omit<AuditLogFilters, "page">>) => void;
  /** Листание — единственный способ поменять страницу без сброса фильтров. */
  setPage: (page: number) => void;
  load: () => Promise<void>;
}

export const useAuditLogStore = create<AuditLogState>((set, get) => ({
  entries: [],
  total: 0,
  page: 1,
  pageSize: 50,
  hasMore: false,
  filters: {},
  secret: null,
  unlocked: false,
  loading: false,
  error: null,

  unlock: async (secret) => {
    set({ loading: true, error: null });
    try {
      const page = await fetchAuditLog({ ...get().filters, page: 1 }, secret);
      set({ secret, unlocked: true, entries: page.items, total: page.total, page: page.page, pageSize: page.pageSize, hasMore: page.hasMore });
      return true;
    } catch (reason) {
      const message = reason instanceof ApiError && reason.status === 503
        ? "Журнал действий не настроен на сервере"
        : "Неверный код доступа к журналу";
      set({ error: message });
      return false;
    } finally {
      set({ loading: false });
    }
  },

  lock: () => set({ secret: null, unlocked: false, entries: [], total: 0, page: 1, error: null }),

  setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters, page: 1 } })),

  setPage: (page) => set((state) => ({ filters: { ...state.filters, page } })),

  load: async () => {
    const { secret, filters } = get();
    if (!secret) return;
    set({ loading: true, error: null });
    try {
      const page = await fetchAuditLog(filters, secret);
      set({ entries: page.items, total: page.total, page: page.page, pageSize: page.pageSize, hasMore: page.hasMore });
    } catch (reason) {
      if (reason instanceof ApiError && (reason.status === 401 || reason.status === 403)) {
        set({ secret: null, unlocked: false, error: "Код доступа больше не действует — введите заново" });
      } else {
        set({ error: reason instanceof Error ? reason.message : "Не удалось загрузить журнал" });
      }
    } finally {
      set({ loading: false });
    }
  },
}));
