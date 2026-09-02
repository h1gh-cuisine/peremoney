import { useEffect, useRef } from 'react';

export function useDebouncedCallback<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function debounced(...args: Args) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delayMs);
  }

  function flush(...args: Args) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    fnRef.current(...args);
  }

  return { debounced, flush };
}
