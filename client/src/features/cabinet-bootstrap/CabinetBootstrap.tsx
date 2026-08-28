'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAccessStore } from '@/entities/access';
import { useSessionStore, visibleSectionsFromCabinet } from '@/entities/session';
import type { HideableSection, SectionVisibility } from '@/entities/access';
import { ApiError, apiClient } from '@/shared/api';
import { useFinanceStore } from '@/entities/finance';

interface CabinetResponse { name: string; visibleSections: string[]; sectionVisibility?: SectionVisibility }

const SECTION_BY_PATH: Record<string, HideableSection> = {
  '/contacts': 'contacts', '/sources': 'sources', '/script': 'script', '/finance': 'finance', '/settings': 'settings',
};

export function CabinetBootstrap({ children }: { children: React.ReactNode }) {
  const user = useSessionStore((state) => state.user);
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role === 'MASTER') return;
    let active = true;
    setReady(false);
    setError('');
    apiClient().get<CabinetResponse>('/cabinets/me').then((cabinet) => {
      if (!active) return;
      const visibility = cabinet.sectionVisibility ?? visibleSectionsFromCabinet(cabinet.visibleSections);
      useAccessStore.setState({
        accessLevel: user.role === 'LIMITED' ? 'limited' : 'full',
        cabinetName: cabinet.name,
        sectionVisibility: visibility, draftSectionVisibility: visibility,
      });
      if (user.cabinetId) void useFinanceStore.getState().load(user.cabinetId);
      setReady(true);
    }).catch((reason: unknown) => {
      if (!active) return;
      setError(reason instanceof ApiError ? reason.message : 'Не удалось загрузить кабинет');
    });
    return () => { active = false; };
  }, [user]);

  const requestedSection = SECTION_BY_PATH[pathname];
  const sectionAllowed = !requestedSection || user?.role !== 'LIMITED'
    || useAccessStore.getState().sectionVisibility[requestedSection];

  useEffect(() => {
    if (ready && !sectionAllowed) router.replace('/dashboard');
  }, [ready, router, sectionAllowed]);

  if (error) return <main style={{ padding: 32 }} role="alert">{error}</main>;
  if (!ready) return <main style={{ padding: 32 }} aria-busy="true">Загружаем кабинет…</main>;
  if (!sectionAllowed) return <main style={{ padding: 32 }} aria-busy="true">Раздел скрыт настройками доступа…</main>;
  return children;
}
