'use client';

import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/entities/session';
import { apiClient } from '@/shared/api';

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();
  const logout = useSessionStore((state) => state.logout);
  return <button type="button" className={className} onClick={() => {
    void apiClient().post('/auth/logout').finally(() => { logout(); router.replace('/login'); });
  }}>
    Выйти
  </button>;
}
