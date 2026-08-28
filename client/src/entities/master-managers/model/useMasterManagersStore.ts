import { create } from "zustand";
import { createMasterManager, deleteMasterManager, fetchMasterManagers } from '../api/master-managers-api';
import type { Manager } from "./types";

interface MasterManagersState {
  managers: Manager[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  load: () => Promise<void>;
  /** "Сотрудники" → добавить (docs-agent.md 1.12.2) */
  addManager: (name: string) => Promise<void>;
  /** "Сотрудники" → удалить */
  removeManager: (id: string) => Promise<void>;
}

export const useMasterManagersStore = create<MasterManagersState>((set) => ({
  managers: [],
  loading: false,
  loaded: false,
  error: null,
  load: async () => {
    set({ loading: true, error: null });
    try {
      set({ managers: await fetchMasterManagers(), loaded: true });
    } catch (reason) {
      set({ error: reason instanceof Error ? reason.message : 'Не удалось загрузить сотрудников' });
    } finally {
      set({ loading: false });
    }
  },
  addManager: async (name) => {
    set({ error: null });
    try {
      const manager = await createMasterManager(name);
      set((state) => ({ managers: [...state.managers, manager] }));
    } catch (reason) {
      const error = reason instanceof Error ? reason : new Error('Не удалось сохранить сотрудника');
      set({ error: error.message });
      throw error;
    }
  },
  removeManager: async (id) => {
    set({ error: null });
    try {
      await deleteMasterManager(id);
      set((state) => ({ managers: state.managers.filter((manager) => manager.id !== id) }));
    } catch (reason) {
      const error = reason instanceof Error ? reason : new Error('Не удалось удалить сотрудника');
      set({ error: error.message });
      throw error;
    }
  },
}));
