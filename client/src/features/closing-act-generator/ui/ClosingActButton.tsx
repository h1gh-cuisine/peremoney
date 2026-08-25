"use client";

import { useState } from "react";
import { ClosingActModal } from "./ClosingActModal";
import styles from "./ClosingActButton.module.scss";

export function ClosingActButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        Закрывающие документы
      </button>
      {open && <ClosingActModal onClose={() => setOpen(false)} />}
    </>
  );
}
