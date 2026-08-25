"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SourceRowMenu.module.scss";

interface SourceRowMenuProps {
  active: boolean;
  onToggle: () => void;
}

export function SourceRowMenu({ active, onToggle }: SourceRowMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
        aria-label="Действия"
      >
        ⋮
      </button>

      {open && (
        <div className={styles.popover}>
          <button
            type="button"
            className={styles.item}
            onClick={() => {
              onToggle();
              setOpen(false);
            }}
          >
            {active ? "Выключить" : "Включить"}
          </button>
        </div>
      )}
    </div>
  );
}
