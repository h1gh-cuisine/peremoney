"use client";

import { useState } from "react";
import { EmployeesModal } from "./EmployeesModal";
import styles from "./EmployeesButton.module.scss";

export function EmployeesButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        Сотрудники
      </button>
      {open && <EmployeesModal onClose={() => setOpen(false)} />}
    </>
  );
}
