import { create } from "zustand";
import { fetchLeadRecordings, fetchLeads, patchLead } from '../api/leads-api';
import type { Lead, LeadStatus } from "./types";

interface LeadsState {
  leads: Lead[];
  loading: boolean;
  error: string | null;
  load: (cabinetId: string) => Promise<void>;
  loadRecordings: (cabinetId: string, id: string) => Promise<void>;
  updateFeedback: (cabinetId: string, id: string, feedback: string) => Promise<void>;
  updateStatus: (cabinetId: string, id: string, status: LeadStatus) => Promise<void>;
  updateAmount: (cabinetId: string, id: string, amount: number | null) => Promise<void>;
}

/**
 * Лиды — единственная сущность в MVP, где редактируемые поля (обратная связь,
 * статус, сумма) хранятся прямо в сторе: это наши данные, а не то, что приходит
 * от провайдера, поэтому у стора есть мутирующие экшены.
 */
export const useLeadsStore = create<LeadsState>((set, get) => {
  async function update(cabinetId: string, id: string, change: Partial<Pick<Lead, 'feedback' | 'status' | 'amount'>>) {
    const previous = get().leads.find((lead) => lead.id === id);
    if (!previous) return;
    const next = { ...previous, ...change };
    set((state) => ({ leads: state.leads.map((lead) => lead.id === id ? next : lead), error: null }));
    try {
      await patchLead(cabinetId, id, { feedback: next.feedback, status: next.status, amount: next.amount });
    } catch (reason) {
      set((state) => ({ leads: state.leads.map((lead) => lead.id === id ? previous : lead), error: reason instanceof Error ? reason.message : 'Не удалось сохранить лид' }));
    }
  }
  return {
    leads: [], loading: false, error: null,
    load: async (cabinetId) => {
      set({ loading: true, error: null });
      try { set({ leads: await fetchLeads(cabinetId) }); }
      catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось загрузить лиды' }); }
      finally { set({ loading: false }); }
    },
    loadRecordings: async (cabinetId, id) => {
      try {
        const recordings = await fetchLeadRecordings(cabinetId, id);
        set((state) => ({ leads: state.leads.map((lead) => lead.id === id ? { ...lead, recordings } : lead), error: null }));
      } catch (reason) {
        set({ error: reason instanceof Error ? reason.message : 'Не удалось загрузить записи' });
      }
    },
    updateFeedback: (cabinetId, id, feedback) => update(cabinetId, id, { feedback }),
    updateStatus: (cabinetId, id, status) => update(cabinetId, id, { status }),
    updateAmount: (cabinetId, id, amount) => update(cabinetId, id, { amount }),
  };
});
