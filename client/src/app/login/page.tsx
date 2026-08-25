'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginResponse, routeForRole, sessionFromLogin, useSessionStore } from '@/entities/session';
import { ApiError, createApiClient } from '@/shared/api';
import styles from './page.module.scss';
import { BrandLogo } from '@/shared/ui/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, user, hydrate, setSession } = useSessionStore();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => { if (!hydrated) hydrate(); }, [hydrate, hydrated]);
  useEffect(() => { if (hydrated && user) router.replace(routeForRole(user.role)); }, [hydrated, router, user]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setLoading(true);
    try {
      const api = createApiClient({
        baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4010/api', getToken: () => null,
      });
      const response = await api.post<LoginResponse>('/auth/login', { login, password });
      const session = sessionFromLogin(response);
      setSession(session); router.replace(routeForRole(session.user.role));
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Не удалось войти');
    } finally { setLoading(false); }
  }

  return <main className={styles.page}>
    <form className={styles.card} onSubmit={submit}>
      <div className={styles.brand}><BrandLogo size="login" priority /></div>
      <h1>Вход в личный кабинет</h1>
      <label>Логин<input autoComplete="username" value={login} onChange={(event) => setLogin(event.target.value)} required /></label>
      <label>Пароль<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button disabled={loading}>{loading ? 'Входим…' : 'Войти'}</button>
    </form>
  </main>;
}
