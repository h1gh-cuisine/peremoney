"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./ProjectRowMenu.module.scss";

interface ProjectRowMenuProps {
  active: boolean;
  onToggleActive: () => void;
  onHide: () => void;
}

const POPOVER_WIDTH = 160;
const POPOVER_HEIGHT = 82;
const POPOVER_GAP = 4;
const VIEWPORT_MARGIN = 8;

export function getProjectMenuPosition(
  trigger: Pick<DOMRect, "left" | "right" | "top" | "bottom">,
  viewport: { width: number; height: number },
) {
  const left = Math.max(
    VIEWPORT_MARGIN,
    Math.min(trigger.right - POPOVER_WIDTH, viewport.width - POPOVER_WIDTH - VIEWPORT_MARGIN),
  );
  const below = trigger.bottom + POPOVER_GAP;
  const top = below + POPOVER_HEIGHT <= viewport.height - VIEWPORT_MARGIN
    ? below
    : Math.max(VIEWPORT_MARGIN, trigger.top - POPOVER_GAP - POPOVER_HEIGHT);

  return { left, top };
}

/** "Управлять": Отключить/Включить + Скрыть строку (docs-agent.md 1.12.2) */
export function ProjectRowMenu({ active, onToggleActive, onHide }: ProjectRowMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function updatePosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPosition(getProjectMenuPosition(rect, { width: window.innerWidth, height: window.innerHeight }));
  }

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) setOpen(false);
    }
    if (!open) return;
    updatePosition();
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  return (
    <div className={styles.root} ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Управлять
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          className={styles.popover}
          role="menu"
          style={{ left: position.left, top: position.top }}
        >
          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => {
              onToggleActive();
              setOpen(false);
            }}
          >
            {active ? "Отключить" : "Включить"}
          </button>
          <button
            type="button"
            className={styles.item}
            role="menuitem"
            onClick={() => {
              onHide();
              setOpen(false);
            }}
          >
            Скрыть строку
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
