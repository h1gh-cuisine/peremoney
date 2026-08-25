'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSessionStore } from '@/entities/session';

interface AuthGateProps { children: React.ReactNode; master?: boolean }

export function AuthGate({ children, master = false }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { hydrated, user, hydrate } = useSessionStore();

  useEffect(() => { if (!hydrated) hydrate(); }, [hydrate, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (master && user.role !== 'MASTER') router.replace('/dashboard');
    else if (!master && user.role === 'MASTER') router.replace('/master/dashboard');
  }, [hydrated, master, pathname, router, user]);

  if (!hydrated || !user || (master ? user.role !== 'MASTER' : user.role === 'MASTER')) {
    return <main style={{ padding: 32 }} aria-busy="true">Проверяем сессию…</main>;
  }
  return children;
}
