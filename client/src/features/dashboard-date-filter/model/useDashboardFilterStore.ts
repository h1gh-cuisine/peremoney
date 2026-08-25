import { create } from "zustand";
import { lastNDaysRange, type DateRange } from "@/shared/lib/date";

interface DashboardFilterState {
  range: DateRange;
  setRange: (range: DateRange) => void;
}

export const useDashboardFilterStore = create<DashboardFilterState>((set) => ({
  range: lastNDaysRange(14),
  setRange: (range) => set({ range }),
}));
