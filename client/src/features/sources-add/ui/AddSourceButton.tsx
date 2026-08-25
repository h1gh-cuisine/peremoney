"use client";

import { useState } from "react";
import { AddSourceModal } from "./AddSourceModal";
import styles from "./AddSourceButton.module.scss";

export function AddSourceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        Добавить источник
      </button>
      {open && <AddSourceModal onClose={() => setOpen(false)} />}
    </>
  );
}
