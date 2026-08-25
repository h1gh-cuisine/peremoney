"use client";

import type { Lead } from "@/entities/leads";
import { exportLeadsToCsv } from "../lib/exportLeadsToCsv";
import styles from "./ExportLeadsButton.module.scss";

interface ExportLeadsButtonProps {
  leads: Lead[];
}

export function ExportLeadsButton({ leads }: ExportLeadsButtonProps) {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={() => exportLeadsToCsv(leads)}
      disabled={leads.length === 0}
    >
      Экспорт
    </button>
  );
}
