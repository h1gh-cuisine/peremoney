import { create } from "zustand";
import { managersFromProjectNames } from "../lib/managers";
import type { Manager } from "./types";

interface MasterManagersState {
  managers: Manager[];
  hydrateFromProjectNames: (names: string[]) => void;
  /** "Сотрудники" → добавить (docs-agent.md 1.12.2) */
  addManager: (name: string) => void;
  /** "Сотрудники" → удалить */
  removeManager: (id: string) => void;
}

export const useMasterManagersStore = create<MasterManagersState>((set) => ({
  managers: [],
  hydrateFromProjectNames: (names) => set({ managers: managersFromProjectNames(names) }),
  addManager: (name) =>
    set((state) => ({
      managers: [...state.managers, { id: `MGR-${Date.now()}`, name }],
    })),
  removeManager: (id) =>
    set((state) => ({ managers: state.managers.filter((m) => m.id !== id) })),
}));
