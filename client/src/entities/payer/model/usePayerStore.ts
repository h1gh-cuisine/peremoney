import { create } from "zustand";
import { EMPTY_PAYER, fetchPayer, savePayer } from '../api/payer-api';
import type { PayerDetails } from "./types";

interface PayerState {
  /** Применённые реквизиты — то, что подставляется в счета/акты (docs-agent.md 2.7.1) */
  saved: PayerDetails;
  draft: PayerDetails;
  cabinetId: string | null;
  loading: boolean;
  error: string | null;
  load: (cabinetId: string) => Promise<void>;
  updateDraft: (patch: Partial<PayerDetails>) => void;
  save: () => Promise<boolean>;
}

/** Редактируется и клиентом, и менеджером, без ограничений по полям (docs-agent.md 1.10). */
export const usePayerStore = create<PayerState>((set, get) => ({
  saved: EMPTY_PAYER,
  draft: EMPTY_PAYER,
  cabinetId: null, loading: false, error: null,
  load: async (cabinetId) => {
    set({ cabinetId, loading: true, error: null });
    try { const value = await fetchPayer(cabinetId); set({ saved: value, draft: value }); }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось загрузить плательщика' }); }
    finally { set({ loading: false }); }
  },
  updateDraft: (patch) => set((state) => ({ draft: { ...state.draft, ...patch } })),
  save: async () => {
    const { cabinetId, draft } = get();
    if (!cabinetId) return false;
    try { await savePayer(cabinetId, draft); set({ saved: draft, error: null }); return true; }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось сохранить плательщика' }); return false; }
  },
}));
