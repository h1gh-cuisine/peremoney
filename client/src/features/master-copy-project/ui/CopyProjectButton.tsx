"use client";

import { useState } from "react";
import { CopyProjectModal } from "./CopyProjectModal";
import styles from "./CopyProjectButton.module.scss";

export function CopyProjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        Копировать проект
      </button>
      {open && <CopyProjectModal onClose={() => setOpen(false)} />}
    </>
  );
}
