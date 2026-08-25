"use client";

import { useEffect, useRef, useState } from "react";
import { formatShortDate } from "@/shared/lib/format";
import { lastNDaysRange, type DateRange } from "@/shared/lib/date";
import styles from "./DateRangePicker.module.scss";

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: "7 дней", days: 7 },
  { label: "14 дней", days: 14 },
  { label: "30 дней", days: 30 },
  { label: "90 дней", days: 90 },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DateRange>(value);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((v) => !v)}
      >
        <span>
          {formatShortDate(value.from)} – {formatShortDate(value.to)}
        </span>
      </button>

      {open && (
        <div className={styles.popover}>
          <div className={styles.presets}>
            {PRESETS.map((p) => (
              <button
                key={p.days}
                type="button"
                className={styles.presetBtn}
                onClick={() => {
                  const range = lastNDaysRange(p.days);
                  setDraft(range);
                  onChange(range);
                  setOpen(false);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className={styles.fields}>
            <label className={styles.field}>
              <span>С</span>
              <input
                type="date"
                value={draft.from}
                max={draft.to}
                onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))}
              />
            </label>
            <label className={styles.field}>
              <span>По</span>
              <input
                type="date"
                value={draft.to}
                min={draft.from}
                onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))}
              />
            </label>
          </div>

          <button
            type="button"
            className={styles.applyBtn}
            onClick={() => {
              onChange(draft);
              setOpen(false);
            }}
          >
            Применить
          </button>
        </div>
      )}
    </div>
  );
}
