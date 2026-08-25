import { create } from "zustand";
import type { MasterPeriod } from "@/entities/master-payments";

function currentMonthPeriod(): MasterPeriod {
  const today = new Date();
  return { kind: "month", year: today.getFullYear(), month: today.getMonth() };
}

interface MasterDashboardFilterState {
  period: MasterPeriod;
  setPeriod: (period: MasterPeriod) => void;
}

export const useMasterDashboardFilterStore = create<MasterDashboardFilterState>((set) => ({
  period: currentMonthPeriod(),
  setPeriod: (period) => set({ period }),
}));
