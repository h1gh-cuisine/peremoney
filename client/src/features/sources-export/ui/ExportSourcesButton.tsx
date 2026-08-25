"use client";

import type { Source } from "@/entities/sources";
import { exportSourcesToCsv } from "../lib/exportSourcesToCsv";
import styles from "./ExportSourcesButton.module.scss";

interface ExportSourcesButtonProps {
  sources: Source[];
}

export function ExportSourcesButton({ sources }: ExportSourcesButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => exportSourcesToCsv(sources)}
      disabled={sources.length === 0}
    >
      Экспорт
    </button>
  );
}
