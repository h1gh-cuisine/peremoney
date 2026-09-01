import { create } from "zustand";
import { cloneMasterProject, createMasterProject, deleteMasterProject, fetchMasterProjects, linkProviderProject, patchMasterBalance, patchMasterProject } from '../api/master-projects-api';
import type { CreateProjectInput, MasterProject, RenewalStatus } from "./types";
import type { DateRange } from '@/shared/lib/date';
import type { ProjectType } from '@/shared/lib/projectType';

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
  /** Создаёт кабинет для уже существующего внешнего проекта. */
  linkProject: (input: CloneProjectInput) => Promise<MasterProject | null>;
  /** "Копировать проект" — новый кабинет с тем же providerProjectId, что у
   * source: лиды с текущего момента приходят синхронно в оба, история до
   * копирования в новый кабинет не попадает (AnswerSyncService). */
  copyProject: (sourceId: string, name: string) => Promise<MasterProject | null>;
  toggleActive: (id: string) => void;
  toggleHidden: (id: string) => void;
  updatePrice: (id: string, price: number) => void;
  updateBalance: (id: string, moneyBalance: number) => Promise<void>;
  updateType: (id: string, type: ProjectType) => Promise<void>;
  updateManager: (id: string, managerId: string) => Promise<void>;
  updateRenewalStatus: (id: string, status: RenewalStatus) => void;
  /** Пароль клиента изменяемый, в отличие от логина (docs-agent.md 1.12.2) */
  updateClientPassword: (id: string, password: string) => Promise<void>;
  /** "Связанные проекты" — внешние project_id, чьи лиды/контакты
   * дублируются в этот кабинет наравне с его собственным. */
  updateLinkedProjects: (id: string, linkedProviderProjectIds: number[]) => Promise<void>;
  removeProject: (id: string, secretCode: string) => Promise<void>;
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
    catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось подключить проект' }); return null; }
  },

  copyProject: async (sourceId, name) => {
    const source = get().projects.find((p) => p.id === sourceId);
    if (!source) { set({ error: 'Исходный проект не найден' }); return null; }
    try {
      const project = await cloneMasterProject(sourceId, { name, type: source.type, price: source.price, managerId: source.managerId });
      set((state) => ({ projects: [project, ...state.projects], error: null }));
      return project;
    } catch (reason) {
      set({ error: reason instanceof Error ? reason.message : 'Не удалось скопировать проект' });
      return null;
    }
  },

  toggleActive: (id) => { const value = !get().projects.find((p) => p.id === id)?.active;
    set((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, active: value } : p) }));
    void patchMasterProject(id, { isActive: value }).catch((e: unknown) => set({ error: e instanceof Error ? e.message : 'Ошибка обновления' })); },
  toggleHidden: (id) => { const value = !get().projects.find((p) => p.id === id)?.hidden;
    set((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, hidden: value } : p) }));
    void patchMasterProject(id, { hidden: value }).catch((e: unknown) => set({ error: e instanceof Error ? e.message : 'Ошибка обновления' })); },
  updatePrice: (id, price) => { set((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, price } : p) }));
    void patchMasterProject(id, { price }).catch((e: unknown) => set({ error: e instanceof Error ? e.message : 'Ошибка обновления' })); },
  updateBalance: async (id, moneyBalance) => {
    try {
      const updated = await patchMasterBalance(id, moneyBalance);
      set((state) => ({ projects: state.projects.map((p) => p.id === id
        ? { ...p, moneyBalance: Number(updated.moneyBalance) } : p), error: null }));
    } catch (reason) {
      set({ error: reason instanceof Error ? reason.message : 'Не удалось изменить баланс' });
      throw reason;
    }
  },
  updateType: async (id, type) => {
    const previous = get().projects;
    set({ projects: previous.map((project) => project.id === id ? { ...project, type } : project), error: null });
    try { await patchMasterProject(id, { type }); }
    catch (reason) {
      set({ projects: previous, error: reason instanceof Error ? reason.message : 'Не удалось изменить тип проекта' });
      throw reason;
    }
  },
  updateManager: async (id, managerId) => {
    const previous = get().projects;
    set({ projects: previous.map((project) => project.id === id ? { ...project, managerId } : project), error: null });
    try { await patchMasterProject(id, { managerName: managerId }); }
    catch (reason) {
      set({ projects: previous, error: reason instanceof Error ? reason.message : 'Не удалось сменить менеджера' });
      throw reason;
    }
  },
  updateRenewalStatus: (id, status) => { set((state) => ({ projects: state.projects.map((p) => p.id === id ? { ...p, renewalStatus: status } : p) }));
    void patchMasterProject(id, { renewalStatus: status }).catch((e: unknown) => set({ error: e instanceof Error ? e.message : 'Ошибка обновления' })); },
  updateClientPassword: async (id, password) => {
    const previous = get().projects;
    set({ projects: previous.map((p) => p.id === id ? { ...p, clientPassword: password } : p), error: null });
    try { await patchMasterProject(id, { clientPassword: password }); }
    catch (reason) {
      set({ projects: previous, error: reason instanceof Error ? reason.message : 'Ошибка обновления' });
      throw reason;
    }
  },
  updateLinkedProjects: async (id, linkedProviderProjectIds) => {
    const previous = get().projects;
    set({ projects: previous.map((p) => p.id === id ? { ...p, linkedProviderProjectIds } : p), error: null });
    try { await patchMasterProject(id, { linkedProviderProjectIds }); }
    catch (reason) {
      set({ projects: previous, error: reason instanceof Error ? reason.message : 'Ошибка обновления' });
      throw reason;
    }
  },
  removeProject: async (id, secretCode) => {
    try {
      await deleteMasterProject(id, secretCode);
      set((state) => ({ projects: state.projects.filter((project) => project.id !== id), error: null }));
    } catch (reason) {
      set({ error: reason instanceof Error ? reason.message : 'Не удалось удалить проект' });
      throw reason;
    }
  },
}));
