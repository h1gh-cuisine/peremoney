'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LoginResponse, routeForRole, sessionFromLogin, useSessionStore, type SessionScope } from '@/entities/session';
import { ApiError, createApiClient } from '@/shared/api';
import styles from './page.module.scss';
import { BrandLogo } from '@/shared/ui/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const { hydrated, masterSession, clientSession, hydrate, setSession } = useSessionStore();
  const [intendedScope, setIntendedScope] = useState<SessionScope | null>(null);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [offerAccepted, setOfferAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const next = new URLSearchParams(window.location.search).get('next') ?? '';
    const scope: SessionScope = next.startsWith('/master') ? 'master' : 'client';
    setIntendedScope(scope);
    if (!hydrated) hydrate(scope);
  }, [hydrate, hydrated]);
  useEffect(() => {
    if (!hydrated || !intendedScope) return;
    const session = intendedScope === 'master' ? masterSession : clientSession;
    if (session) router.replace(routeForRole(session.user.role));
  }, [clientSession, hydrated, intendedScope, masterSession, router]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!offerAccepted) {
      setError('Примите условия публичной оферты');
      return;
    }
    setError(''); setLoading(true);
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
      <label className={styles.consent}>
        <input
          type="checkbox"
          checked={offerAccepted}
          onChange={(event) => {
            setOfferAccepted(event.target.checked);
            if (event.target.checked && error === 'Примите условия публичной оферты') setError('');
          }}
          required
        />
        <span>
          Я принимаю условия{' '}
          <a href="/offer" target="_blank" rel="noreferrer">публичной оферты</a>
        </span>
      </label>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button disabled={loading || !offerAccepted}>{loading ? 'Входим…' : 'Войти'}</button>
    </form>
  </main>;
}
