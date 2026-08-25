"use client";

import { useEffect, useRef, useState } from "react";
import type { LeadRecording } from "@/entities/leads";
import styles from "./RecordingsButton.module.scss";

interface RecordingsButtonProps {
  recordings: LeadRecording[];
  onLoad?: () => void;
}

function HeadsetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 13v-1a8 8 0 0 1 16 0v1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="2" y="13" width="5" height="7" rx="2" stroke="currentColor" strokeWidth="2" />
      <rect x="17" y="13" width="5" height="7" rx="2" stroke="currentColor" strokeWidth="2" />
      <path
        d="M20 20v1a3 3 0 0 1-3 3h-3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function RecordingsButton({ recordings, onLoad }: RecordingsButtonProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  if (recordings.length === 0) {
    return (
      <button type="button" className={styles.button} onClick={onLoad} disabled={!onLoad} title="Загрузить записи">
        <HeadsetIcon />
      </button>
    );
  }

  if (recordings.length === 1) {
    return (
      <a
        className={styles.button}
        href={recordings[0].link}
        target="_blank"
        rel="noreferrer"
        title="Скачать запись"
      >
        <HeadsetIcon />
      </a>
    );
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.button}
        onClick={() => setOpen((v) => !v)}
        title={`Записей: ${recordings.length}`}
      >
        <HeadsetIcon />
        <span className={styles.count}>{recordings.length}</span>
      </button>

      {open && (
        <div className={styles.popover}>
          {recordings.map((rec, i) => (
            <a key={rec.id} href={rec.link} target="_blank" rel="noreferrer" className={styles.link}>
              Запись {i + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
