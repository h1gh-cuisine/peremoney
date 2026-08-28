'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSessionStore } from '@/entities/session';

interface AuthGateProps { children: React.ReactNode; master?: boolean }

export function AuthGate({ children, master = false }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const scope = master ? 'master' : 'client';
  const { hydrated, user, activeScope, hydrate, activate } = useSessionStore();

  useEffect(() => {
    if (!hydrated) hydrate(scope);
    else if (activeScope !== scope) activate(scope);
  }, [activate, activeScope, hydrate, hydrated, scope]);
  useEffect(() => {
    if (!hydrated || activeScope !== scope) return;
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (master && user.role !== 'MASTER') router.replace('/dashboard');
    else if (!master && user.role === 'MASTER') router.replace('/master/dashboard');
  }, [activeScope, hydrated, master, pathname, router, scope, user]);

  if (!hydrated || activeScope !== scope || !user || (master ? user.role !== 'MASTER' : user.role === 'MASTER')) {
    return <main style={{ padding: 32 }} aria-busy="true">Проверяем сессию…</main>;
  }
  return children;
}
