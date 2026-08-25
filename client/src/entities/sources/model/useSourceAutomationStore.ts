import { create } from "zustand";
import { saveAutomation } from '../api/sources-api';
import type { SourceAutomationSettings } from "./types";

interface SourceAutomationState extends SourceAutomationSettings {
  cabinetId: string | null;
  error: string | null;
  setCabinetId: (cabinetId: string) => void;
  setAutoCleanupEnabled: (enabled: boolean) => void;
  setMinContactsPerLead: (value: number) => void;
  setAutoManageEnabled: (enabled: boolean) => void;
  setMinConversion: (value: number) => void;
}

/**
 * Настройки для ежедневной автоматизации тегов в 18:00 (docs-agent.md 2.6.4).
 * Правило "автоматическая чистка" / "автоматическое управление" выполняется
 * по расписанию на бэкенде — здесь хранится только конфиг порогов.
 */
export const useSourceAutomationStore = create<SourceAutomationState>((set, get) => {
  async function persist(change: Partial<SourceAutomationSettings>) {
    const previous = get();
    set({ ...change, error: null });
    const cabinetId = get().cabinetId;
    if (!cabinetId) return;
    const next = get();
    try {
      await saveAutomation(cabinetId, { autoCleanupEnabled: next.autoCleanupEnabled,
        minContactsPerLead: next.minContactsPerLead, autoManageEnabled: next.autoManageEnabled,
        minConversion: next.minConversion });
    } catch (reason) {
      set({ autoCleanupEnabled: previous.autoCleanupEnabled, minContactsPerLead: previous.minContactsPerLead,
        autoManageEnabled: previous.autoManageEnabled, minConversion: previous.minConversion,
        error: reason instanceof Error ? reason.message : 'Не удалось сохранить автоматизацию' });
    }
  }
  return {
  cabinetId: null, error: null,
  autoCleanupEnabled: false,
  minContactsPerLead: 3,
  autoManageEnabled: false,
  minConversion: 25,
  setCabinetId: (cabinetId) => set({ cabinetId }),
  setAutoCleanupEnabled: (autoCleanupEnabled) => { void persist({ autoCleanupEnabled }); },
  setMinContactsPerLead: (minContactsPerLead) => { void persist({ minContactsPerLead }); },
  setAutoManageEnabled: (autoManageEnabled) => { void persist({ autoManageEnabled }); },
  setMinConversion: (minConversion) => { void persist({ minConversion }); },
  };
});
