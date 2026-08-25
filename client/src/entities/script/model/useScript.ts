import { useEffect, useState } from 'react';
import { fetchScript } from '../api/script-api';
import type { ScriptData } from './types';

export function useScript() {
  const [data, setData] = useState<ScriptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; fetchScript().then((value) => { if (active) setData(value); })
    .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Не удалось загрузить скрипт'); });
    return () => { active = false; }; }, []);
  return { data, error };
}
