import { create } from "zustand";
import type { AccessLevel, HideableSection, SectionVisibility } from "./types";

interface AccessState {
  /** Уровень доступа текущего пользователя кабинета (docs-agent.md 2.1) */
  accessLevel: AccessLevel;
  /** Полное название текущего проекта (Topbar показывает только последний сегмент) */
  cabinetName: string;
  /** Применённые флаги видимости — то, что реально влияет на сайдбар */
  sectionVisibility: SectionVisibility;
  /** Черновик из формы "Настройки" — вступает в силу только по кнопке "СОХРАНИТЬ НАСТРОЙКИ" (docs-agent.md 1.11) */
  draftSectionVisibility: SectionVisibility;
  setAccessLevel: (level: AccessLevel) => void;
  setDraftSectionVisibility: (section: HideableSection, visible: boolean) => void;
  commitVisibilityDraft: () => void;
  resetVisibilityDraft: () => void;
  /** Итоговая видимость раздела с учётом роли и применённых флагов скрытия */
  isSectionVisible: (section: HideableSection) => boolean;
}

const DEFAULT_VISIBILITY: SectionVisibility = {
  contacts: true,
  sources: true,
  script: true,
  finance: true,
  settings: true,
};

export const useAccessStore = create<AccessState>((set, get) => ({
  accessLevel: "full",
  cabinetName: "",
  sectionVisibility: DEFAULT_VISIBILITY,
  draftSectionVisibility: DEFAULT_VISIBILITY,
  setAccessLevel: (level) => set({ accessLevel: level }),
  setDraftSectionVisibility: (section, visible) =>
    set((state) => ({
      draftSectionVisibility: { ...state.draftSectionVisibility, [section]: visible },
    })),
  commitVisibilityDraft: () =>
    set((state) => ({ sectionVisibility: state.draftSectionVisibility })),
  resetVisibilityDraft: () =>
    set((state) => ({ draftSectionVisibility: state.sectionVisibility })),
  isSectionVisible: (section) => {
    const { accessLevel, sectionVisibility } = get();
    if (accessLevel === "full") return true;
    return sectionVisibility[section];
  },
}));
