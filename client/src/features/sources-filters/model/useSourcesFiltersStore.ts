import { create } from "zustand";
import type { DateRange } from "@/shared/lib/date";
import { defaultSourcesRange, useSourcesStore, type SourceStatusFilter } from "@/entities/sources";

interface SourcesFiltersState {
  draftRange: DateRange;
  draftOnlyWithLeads: boolean;
  draftStatus: SourceStatusFilter;
  draftSearch: string;
  appliedOnlyWithLeads: boolean;
  appliedStatus: SourceStatusFilter;
  appliedSearch: string;
  setDraftRange: (range: DateRange) => void;
  setDraftOnlyWithLeads: (value: boolean) => void;
  setDraftStatus: (value: SourceStatusFilter) => void;
  setDraftSearch: (value: string) => void;
  /** Без этого вызова запрос не отправляется — фильтр не реактивный (docs-agent.md 1.7). */
  applyFilters: () => void;
}

export const useSourcesFiltersStore = create<SourcesFiltersState>((set, get) => ({
  draftRange: defaultSourcesRange(),
  draftOnlyWithLeads: false,
  draftStatus: "all",
  draftSearch: "",
  appliedOnlyWithLeads: false,
  appliedStatus: "all",
  appliedSearch: "",
  setDraftRange: (draftRange) => set({ draftRange }),
  setDraftOnlyWithLeads: (draftOnlyWithLeads) => set({ draftOnlyWithLeads }),
  setDraftStatus: (draftStatus) => set({ draftStatus }),
  setDraftSearch: (draftSearch) => set({ draftSearch }),
  applyFilters: () => {
    const { draftRange, draftOnlyWithLeads, draftStatus, draftSearch } = get();
    useSourcesStore.getState().loadSources(draftRange);
    set({ appliedOnlyWithLeads: draftOnlyWithLeads, appliedStatus: draftStatus, appliedSearch: draftSearch });
  },
}));
