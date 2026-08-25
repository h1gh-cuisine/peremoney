import { create } from "zustand";
import { lastNDaysRange, type DateRange } from "@/shared/lib/date";
import type { LeadStatus } from "@/entities/leads";

interface LeadsFiltersState {
  range: DateRange;
  status: LeadStatus | "all";
  search: string;
  setRange: (range: DateRange) => void;
  setStatus: (status: LeadStatus | "all") => void;
  setSearch: (search: string) => void;
}

export const useLeadsFiltersStore = create<LeadsFiltersState>((set) => ({
  range: lastNDaysRange(30),
  status: "all",
  search: "",
  setRange: (range) => set({ range }),
  setStatus: (status) => set({ status }),
  setSearch: (search) => set({ search }),
}));
