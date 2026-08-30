import { create } from "zustand";
import { fetchAutomation, saveAutomation } from '../api/sources-api';
import type { SourceAutomationSettings } from "./types";

interface SourceAutomationState extends SourceAutomationSettings {
  cabinetId: string | null;
  error: string | null;
  dirty: boolean;
  loading: boolean;
  saving: boolean;
  setCabinetId: (cabinetId: string) => void;
  load: () => Promise<void>;
  setAutoCleanupEnabled: (enabled: boolean) => void;
  setMinContactsPerLead: (value: number) => void;
  setAutoManageEnabled: (enabled: boolean) => void;
  setMinConversion: (value: number) => void;
  setDefaultLimit: (value: number) => void;
  setMaxLimit: (value: number) => void;
  save: () => Promise<boolean>;
  discard: () => void;
}

/**
 * Настройки для ежедневной автоматизации тегов в 18:00 (docs-agent.md 2.6.4).
 * Правило "автоматическая чистка" / "автоматическое управление" выполняется
 * по расписанию на бэкенде — здесь хранится только конфиг порогов.
 */
export const useSourceAutomationStore = create<SourceAutomationState>((set, get) => {
  let committed: SourceAutomationSettings = {
    autoCleanupEnabled: false, minContactsPerLead: 2, autoManageEnabled: false, minConversion: 20,
    defaultLimit: 5, maxLimit: 50,
  };
  const draft = () => ({ autoCleanupEnabled: get().autoCleanupEnabled,
    minContactsPerLead: get().minContactsPerLead, autoManageEnabled: get().autoManageEnabled,
    minConversion: get().minConversion, defaultLimit: get().defaultLimit, maxLimit: get().maxLimit });
  return {
  cabinetId: null, error: null, dirty: false, loading: false, saving: false,
  autoCleanupEnabled: false,
  minContactsPerLead: 2,
  autoManageEnabled: false,
  minConversion: 20,
  defaultLimit: 5,
  maxLimit: 50,
  setCabinetId: (cabinetId) => { set({ cabinetId }); void get().load(); },
  load: async () => {
    const cabinetId = get().cabinetId;
    if (!cabinetId) return;
    set({ loading: true, error: null });
    try {
      const settings = await fetchAutomation(cabinetId);
      committed = settings;
      set({ ...settings, dirty: false });
    } catch (reason) {
      set({ error: reason instanceof Error ? reason.message : 'Не удалось загрузить настройки автоматизации' });
    } finally {
      set({ loading: false });
    }
  },
  setAutoCleanupEnabled: (autoCleanupEnabled) => set({ autoCleanupEnabled, dirty: true, error: null }),
  setMinContactsPerLead: (minContactsPerLead) => set({ minContactsPerLead, dirty: true, error: null }),
  setAutoManageEnabled: (autoManageEnabled) => set({ autoManageEnabled, dirty: true, error: null }),
  setMinConversion: (minConversion) => set({ minConversion, dirty: true, error: null }),
  setDefaultLimit: (defaultLimit) => set({ defaultLimit, dirty: true, error: null }),
  setMaxLimit: (maxLimit) => set({ maxLimit, dirty: true, error: null }),
  save: async () => {
    const cabinetId = get().cabinetId;
    if (!cabinetId) return false;
    const settings = draft();
    set({ saving: true, error: null });
    try {
      await saveAutomation(cabinetId, settings);
      committed = settings;
      set({ dirty: false });
      return true;
    } catch (reason) {
      set({ error: reason instanceof Error ? reason.message : 'Не удалось сохранить автоматизацию' });
      return false;
    } finally {
      set({ saving: false });
    }
  },
  discard: () => set({ ...committed, dirty: false, error: null }),
  };
});
