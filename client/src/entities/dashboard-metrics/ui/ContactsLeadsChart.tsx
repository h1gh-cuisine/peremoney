"use client";

import { useMemo, useState } from "react";
import { formatNumber, formatShortDate } from "@/shared/lib/format";
import type { DailyContactsLeadsPoint } from "../model/types";
import styles from "./ContactsLeadsChart.module.scss";

interface ContactsLeadsChartProps {
  data: DailyContactsLeadsPoint[];
}

const WIDTH = 960;
const HEIGHT = 260;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

export function ContactsLeadsChart({ data }: ContactsLeadsChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxContacts = useMemo(
    () => Math.max(1, ...data.map((d) => d.contacts)),
    [data],
  );

  const chartHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const slotWidth = WIDTH / (data.length || 1);
  const barWidth = Math.min(28, slotWidth * 0.55);

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotContacts}`} /> Контакты
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotLeads}`} /> Лиды
        </span>
      </div>

      <div className={styles.chartArea}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={styles.svg} preserveAspectRatio="none">
          {data.map((point, i) => {
            const x = i * slotWidth + slotWidth / 2 - barWidth / 2;
            const contactsH = (point.contacts / maxContacts) * chartHeight;
            const leadsH = (point.leads / maxContacts) * chartHeight;
            const yContacts = PADDING_TOP + (chartHeight - contactsH);
            const yLeads = PADDING_TOP + (chartHeight - leadsH);

            return (
              <g
                key={point.date}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((v) => (v === i ? null : v))}
              >
                <rect
                  x={x - 4}
                  y={PADDING_TOP}
                  width={barWidth + 8}
                  height={chartHeight}
                  fill="transparent"
                />
                <rect
                  className={styles.barContacts}
                  x={x}
                  y={yContacts}
                  width={barWidth}
                  height={Math.max(1, contactsH)}
                  rx={3}
                />
                <rect
                  className={styles.barLeads}
                  x={x}
                  y={yLeads}
                  width={barWidth}
                  height={Math.max(1, leadsH)}
                  rx={3}
                />
              </g>
            );
          })}
        </svg>

        {hovered && (
          <div className={styles.tooltip}>
            <div className={styles.tooltipDate}>{formatShortDate(hovered.date)}</div>
            <div className={styles.tooltipRow}>
              <span className={`${styles.dot} ${styles.dotContacts}`} /> Контакты:{" "}
              {formatNumber(hovered.contacts)}
            </div>
            <div className={styles.tooltipRow}>
              <span className={`${styles.dot} ${styles.dotLeads}`} /> Лиды:{" "}
              {formatNumber(hovered.leads)}
            </div>
          </div>
        )}
      </div>

      <div className={styles.axis}>
        {data.map((point, i) => (
          <span
            key={point.date}
            className={styles.axisLabel}
            style={{ width: `${100 / data.length}%` }}
          >
            {i % Math.ceil(data.length / 10 || 1) === 0 ? formatShortDate(point.date) : ""}
          </span>
        ))}
      </div>
    </div>
  );
}
