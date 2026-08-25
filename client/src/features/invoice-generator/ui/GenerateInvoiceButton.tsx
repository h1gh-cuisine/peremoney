"use client";

import { useState } from "react";
import { InvoiceModal } from "./InvoiceModal";
import styles from "./GenerateInvoiceButton.module.scss";

export function GenerateInvoiceButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        Сформировать счёт
      </button>
      {open && <InvoiceModal onClose={() => setOpen(false)} />}
    </>
  );
}
