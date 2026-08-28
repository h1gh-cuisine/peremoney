import { create } from "zustand";
import { createMasterProject, fetchMasterProjects, linkProviderProject, patchMasterProject } from '../api/master-projects-api';
import type { CreateProjectInput, MasterProject, RenewalStatus } from "./types";
import type { DateRange } from '@/shared/lib/date';

interface CloneProjectInput {
  providerProjectId: number;
  price: number;
  managerId: string;
}

interface MasterProjectsState {
  projects: MasterProject[];
  loading: boolean; error: string | null;
  load: (range?: DateRange) => Promise<void>;
  /** "Создать проект" — 2.8.3: имя по шаблону + автогенерация логинов/паролей кабинета */
  createProject: (input: CreateProjectInput) => Promise<MasterProject>;
  /** Создаёт кабинет для уже существующего проекта Leads Factory. */
  linkProject: (input: CloneProjectInput) => Promise<MasterProject | null>;
  toggleActive: (id: string) => void;
  toggleHidden: (id: string) => void;
  updatePrice: (id: string, price: number) => void;
  updateRenewalStatus: (id: string, status: RenewalStatus) => void;
  /** Пароль клиента изменяемый, в отличие от логина (docs-agent.md 1.12.2) */
  updateClientPassword: (id: string, password: string) => void;
}

export const useMasterProjectsStore = create<MasterProjectsState>((set, get) => ({
  projects: [], loading: false, error: null,
  load: async (range) => { set({ loading: true, error: null }); try { set({ projects: await fetchMasterProjects(range) }); }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось загрузить проекты' }); } finally { set({ loading: false }); } },

  createProject: async (input) => {
    try {
      const project = await createMasterProject(input);
      set((state) => ({ projects: [project, ...state.projects], error: null }));
      return project;
    } catch (reason) {
      const error = reason instanceof Error ? reason : new Error('Не удалось создать проект');
      set({ error: error.message });
      throw error;
    }
  },

  linkProject: async (input) => {
    try { const project = await linkProviderProject(input); set((state) => ({ projects: [project, ...state.projects], error: null })); return project; }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось подключить проект Leads Factory' }); return null; }
  },

  toggleActive: (id) => { const value = !get().projects.find((p) => p.id === id)?.active;
    set((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, active: value } : p) }));
    void patchMasterProject(id, { isActive: value }).catch((e: unknown) => set({ error: e instanceof Error ? e.message : 'Ошибка обновления' })); },
  toggleHidden: (id) => { const value = !get().projects.find((p) => p.id === id)?.hidden;
    set((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, hidden: value } : p) }));
    void patchMasterProject(id, { hidden: value }).catch((e: unknown) => set({ error: e instanceof Error ? e.message : 'Ошибка обновления' })); },
  updatePrice: (id, price) => { set((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, price } : p) }));
    void patchMasterProject(id, { price }).catch((e: unknown) => set({ error: e instanceof Error ? e.message : 'Ошибка обновления' })); },
  updateRenewalStatus: (id, status) => { set((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, renewalStatus: status } : p) }));
    void patchMasterProject(id, { renewalStatus: status }).catch((e: unknown) => set({ error: e instanceof Error ? e.message : 'Ошибка обновления' })); },
  updateClientPassword: (id, password) => { set((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, clientPassword: password } : p) }));
    void patchMasterProject(id, { clientPassword: password }).catch((e: unknown) => set({ error: e instanceof Error ? e.message : 'Ошибка обновления' })); },
}));
