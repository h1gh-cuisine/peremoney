import { create } from "zustand";
import type { SectionVisibility } from '@/entities/access';
import type { ProjectType } from '@/shared/lib/projectType';
import { fetchCabinetSettings, saveCabinetSettings } from '../api/cabinet-settings-api';
import type { ProjectSettings } from "./types";

const DEFAULT_SETTINGS: ProjectSettings = {
  status: "active",
  timezoneOffset: 3,
  uploadsEnabled: true,
  callsEnabled: true,
  schedulePreset: "everyday",
  scheduleDays: [1, 2, 3, 4, 5, 6, 7],
  crmIntegration: "",
  messengerIntegrations: [],
};

interface SettingsState {
  cabinetId: string | null;
  projectType: ProjectType;
  loading: boolean;
  error: string | null;
  /** Применённые настройки — то, чем реально руководствуется остальной ЛК */
  saved: ProjectSettings;
  /** Черновик формы — вступает в силу только по кнопке "СОХРАНИТЬ НАСТРОЙКИ" */
  draft: ProjectSettings;
  updateDraft: (patch: Partial<ProjectSettings>) => void;
  load: () => Promise<void>;
  save: (visibility: SectionVisibility) => Promise<boolean>;
  resetDraft: () => void;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  cabinetId: null, projectType: 'quals', loading: false, error: null,
  saved: DEFAULT_SETTINGS,
  draft: DEFAULT_SETTINGS,
  updateDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  load: async () => {
    set({ loading: true, error: null });
    try {
      const value = await fetchCabinetSettings();
      const loaded = { status: value.status, timezoneOffset: value.timezoneOffset,
        uploadsEnabled: value.uploadsEnabled, callsEnabled: value.callsEnabled,
        schedulePreset: value.schedulePreset, scheduleDays: value.scheduleDays, crmIntegration: value.crmIntegration,
        messengerIntegrations: value.messengerIntegrations };
      set((state) => ({ cabinetId: value.cabinetId, projectType: value.projectType,
        saved: { ...state.saved, ...loaded }, draft: { ...state.draft, ...loaded } }));
    } catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось загрузить настройки' }); }
    finally { set({ loading: false }); }
  },
  save: async (visibility) => {
    const { cabinetId, draft } = get();
    if (!cabinetId) return false;
    try {
      const result = await saveCabinetSettings(cabinetId, draft, visibility);
      const sync = result.providerSync;
      // The server can silently keep the project paused (insufficient balance) even
      // when the form asked for "Активен" — reflect its authoritative status back into
      // the UI instead of trusting the submitted draft blindly.
      const persisted = { ...draft, status: (result.isActive ? 'active' : 'paused') as ProjectSettings['status'] };
      const message = result.balanceWarning ?? (sync?.status === 'PENDING'
        ? (sync.message ?? 'Настройки сохранены, но изменения пока не подтверждены') : null);
      set({ saved: persisted, draft: persisted, error: message });
      return true;
    }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось сохранить настройки' }); return false; }
  },
  resetDraft: () => set((state) => ({ draft: state.saved })),
}));
