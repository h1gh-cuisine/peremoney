import { useEffect, useState } from "react";
import { useSessionStore } from '@/entities/session';
import { fetchContacts } from '../api/contacts-api';
import type { Contact } from './types';

/** Полный список контактов кабинета; фильтрация происходит выше по слоям. */
export function useContacts() {
  const cabinetId = useSessionStore((state) => state.user?.cabinetId);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!cabinetId) { setLoading(false); return; }
    let active = true;
    setLoading(true); setError(null);
    fetchContacts(cabinetId).then((values) => { if (active) setContacts(values); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить контакты'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cabinetId]);
  return { contacts, loading, error };
}
