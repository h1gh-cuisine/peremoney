import { create } from "zustand";
import { saveAutomation } from '../api/sources-api';
import type { SourceAutomationSettings } from "./types";

interface SourceAutomationState extends SourceAutomationSettings {
  cabinetId: string | null;
  error: string | null;
  dirty: boolean;
  saving: boolean;
  setCabinetId: (cabinetId: string) => void;
  setAutoCleanupEnabled: (enabled: boolean) => void;
  setMinContactsPerLead: (value: number) => void;
  setAutoManageEnabled: (enabled: boolean) => void;
  setMinConversion: (value: number) => void;
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
    autoCleanupEnabled: false, minContactsPerLead: 3, autoManageEnabled: false, minConversion: 25,
  };
  const draft = () => ({ autoCleanupEnabled: get().autoCleanupEnabled,
    minContactsPerLead: get().minContactsPerLead, autoManageEnabled: get().autoManageEnabled,
    minConversion: get().minConversion });
  return {
  cabinetId: null, error: null, dirty: false, saving: false,
  autoCleanupEnabled: false,
  minContactsPerLead: 3,
  autoManageEnabled: false,
  minConversion: 25,
  setCabinetId: (cabinetId) => set({ cabinetId }),
  setAutoCleanupEnabled: (autoCleanupEnabled) => set({ autoCleanupEnabled, dirty: true, error: null }),
  setMinContactsPerLead: (minContactsPerLead) => set({ minContactsPerLead, dirty: true, error: null }),
  setAutoManageEnabled: (autoManageEnabled) => set({ autoManageEnabled, dirty: true, error: null }),
  setMinConversion: (minConversion) => set({ minConversion, dirty: true, error: null }),
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
