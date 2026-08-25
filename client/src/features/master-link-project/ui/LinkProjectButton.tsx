"use client";

import { useState } from "react";
import { LinkProjectModal } from "./LinkProjectModal";
import styles from "./LinkProjectButton.module.scss";

export function LinkProjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        Связать с другим
      </button>
      {open && <LinkProjectModal onClose={() => setOpen(false)} />}
    </>
  );
}
