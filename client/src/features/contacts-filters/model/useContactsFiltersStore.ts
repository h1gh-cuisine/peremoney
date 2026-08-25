import { create } from "zustand";
import { lastNDaysRange, type DateRange } from "@/shared/lib/date";
import type { ContactStatus } from "@/entities/contacts";

interface ContactsFiltersState {
  range: DateRange;
  status: ContactStatus | "all";
  setRange: (range: DateRange) => void;
  setStatus: (status: ContactStatus | "all") => void;
}

export const useContactsFiltersStore = create<ContactsFiltersState>((set) => ({
  range: lastNDaysRange(30),
  status: "all",
  setRange: (range) => set({ range }),
  setStatus: (status) => set({ status }),
}));
