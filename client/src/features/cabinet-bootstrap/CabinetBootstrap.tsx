'use client';

import { useEffect, useState } from 'react';
import { useAccessStore } from '@/entities/access';
import { useSessionStore, visibleSectionsFromCabinet } from '@/entities/session';
import { ApiError, apiClient } from '@/shared/api';
import { useFinanceStore } from '@/entities/finance';

interface CabinetResponse { visibleSections: string[] }

export function CabinetBootstrap({ children }: { children: React.ReactNode }) {
  const user = useSessionStore((state) => state.user);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || user.role === 'MASTER') return;
    let active = true;
    apiClient().get<CabinetResponse>('/cabinets/me').then((cabinet) => {
      if (!active) return;
      const visibility = visibleSectionsFromCabinet(cabinet.visibleSections);
      useAccessStore.setState({
        accessLevel: user.role === 'LIMITED' ? 'limited' : 'full',
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

  if (error) return <main style={{ padding: 32 }} role="alert">{error}</main>;
  if (!ready) return <main style={{ padding: 32 }} aria-busy="true">Загружаем кабинет…</main>;
  return children;
}
