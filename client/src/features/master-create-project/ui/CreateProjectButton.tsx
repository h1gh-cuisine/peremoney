"use client";

import { useState } from "react";
import { CreateProjectModal } from "./CreateProjectModal";
import styles from "./CreateProjectButton.module.scss";

export function CreateProjectButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.button} onClick={() => setOpen(true)}>
        Создать проект
      </button>
      {open && <CreateProjectModal onClose={() => setOpen(false)} />}
    </>
  );
}
