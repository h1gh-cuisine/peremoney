"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatShortDate } from "@/shared/lib/format";
import type { DailyCplSaleCostPoint } from "../model/types";
import styles from "./CplSaleCostChart.module.scss";

interface CplSaleCostChartProps {
  data: DailyCplSaleCostPoint[];
}

const WIDTH = 960;
const HEIGHT = 260;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 28;

export function CplSaleCostChart({ data }: CplSaleCostChartProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const maxValue = useMemo(
    () => Math.max(1, ...data.map((d) => Math.max(d.cpl, d.saleCost))),
    [data],
  );

  const chartHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const slotWidth = WIDTH / (data.length || 1);
  const barWidth = Math.min(12, slotWidth * 0.24);
  const gap = 4;

  const hovered = hoverIdx !== null ? data[hoverIdx] : null;

  return (
    <div className={styles.wrap}>
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotCpl}`} /> CPL
        </span>
        <span className={styles.legendItem}>
          <span className={`${styles.dot} ${styles.dotSaleCost}`} /> Стоимость продажи
        </span>
      </div>

      <div className={styles.chartArea}>
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className={styles.svg} preserveAspectRatio="none">
          {data.map((point, i) => {
            const centerX = i * slotWidth + slotWidth / 2;
            const cplH = (point.cpl / maxValue) * chartHeight;
            const saleH = (point.saleCost / maxValue) * chartHeight;

            const xCpl = centerX - gap / 2 - barWidth;
            const xSale = centerX + gap / 2;

            return (
              <g
                key={point.date}
                onMouseEnter={() => setHoverIdx(i)}
                onMouseLeave={() => setHoverIdx((v) => (v === i ? null : v))}
              >
                <rect
                  x={xCpl - 4}
                  y={PADDING_TOP}
                  width={barWidth * 2 + gap + 8}
                  height={chartHeight}
                  fill="transparent"
                />
                <rect
                  className={styles.barCpl}
                  x={xCpl}
                  y={PADDING_TOP + (chartHeight - cplH)}
                  width={barWidth}
                  height={Math.max(1, cplH)}
                  rx={2}
                />
                <rect
                  className={styles.barSaleCost}
                  x={xSale}
                  y={PADDING_TOP + (chartHeight - saleH)}
                  width={barWidth}
                  height={Math.max(1, saleH)}
                  rx={2}
                />
              </g>
            );
          })}
        </svg>

        {hovered && (
          <div className={styles.tooltip}>
            <div className={styles.tooltipDate}>{formatShortDate(hovered.date)}</div>
            <div className={styles.tooltipRow}>
              <span className={`${styles.dot} ${styles.dotCpl}`} /> CPL:{" "}
              {formatCurrency(hovered.cpl)}
            </div>
            <div className={styles.tooltipRow}>
              <span className={`${styles.dot} ${styles.dotSaleCost}`} /> Ст-ть продажи:{" "}
              {formatCurrency(hovered.saleCost)}
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
