import { create } from "zustand";
import type { DateRange } from "@/shared/lib/date";
import { addSourceValues, fetchSources, toggleSource } from '../api/sources-api';
import { defaultSourcesRange } from "../lib/defaultRange";
import type { Source, SourceType } from "./types";

interface SourcesState {
  range: DateRange;
  sources: Source[];
  cabinetId: string | null;
  loading: boolean;
  error: string | null;
  setCabinetId: (cabinetId: string) => void;
  /** Пересчитывает список под период — вызывается только по кнопке "Запустить фильтрацию". */
  loadSources: (range: DateRange) => Promise<void>;
  /** "Три точки" → вкл/выкл источника (PATCH .../tags/update/{tag_id}, docs-agent.md 2.6.3). */
  toggleActive: (id: string) => Promise<void>;
  /** Массовое добавление источников (docs-agent.md 1.7, "Добавить источник"). */
  addSources: (values: string[], sourceType: SourceType) => Promise<boolean>;
}

const initialRange = defaultSourcesRange();

export const useSourcesStore = create<SourcesState>((set, get) => ({
  range: initialRange,
  sources: [], cabinetId: null, loading: false, error: null,
  setCabinetId: (cabinetId) => { set({ cabinetId }); void get().loadSources(get().range); },
  loadSources: async (range) => {
    const cabinetId = get().cabinetId;
    set({ range });
    if (!cabinetId) return;
    set({ loading: true, error: null });
    try { set({ sources: await fetchSources(cabinetId, range) }); }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось загрузить источники' }); }
    finally { set({ loading: false }); }
  },
  toggleActive: async (id) => {
    const cabinetId = get().cabinetId;
    const previous = get().sources.find((source) => source.id === id);
    if (!cabinetId || !previous) return;
    set((state) => ({ sources: state.sources.map((source) => source.id === id ? { ...source, active: !source.active } : source), error: null }));
    try { await toggleSource(cabinetId, id, !previous.active); }
    catch (reason) { set((state) => ({ sources: state.sources.map((source) => source.id === id ? previous : source), error: reason instanceof Error ? reason.message : 'Не удалось изменить источник' })); }
  },
  addSources: async (values, sourceType) => {
    const cabinetId = get().cabinetId;
    if (!cabinetId) return false;
    try { await addSourceValues(cabinetId, values, sourceType); await get().loadSources(get().range); return true; }
    catch (reason) { set({ error: reason instanceof Error ? reason.message : 'Не удалось добавить источники' }); return false; }
  },
}));
