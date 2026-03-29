"use client";

import { useState, useRef, useCallback } from "react";
import styles from "@/devops-console/console-page.module.css";

const MIN_WIDTH = 320;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 360;

export function WorkspaceLayout({
  assistant,
  assistantOpen,
  children,
}: {
  assistant?: React.ReactNode;
  assistantOpen: boolean;
  children: React.ReactNode;
}) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(DEFAULT_WIDTH);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;

    const onMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      // Dragging left edge → moving left increases width
      const delta = startX.current - ev.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + delta));
      setWidth(next);
    };

    const onMouseUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  const showAssistant = assistant && assistantOpen;

  return (
    <div
      className={`${styles.workspace} ${showAssistant ? styles.workspaceAssistantOpen : ""}`}
      style={showAssistant ? { gridTemplateColumns: `minmax(0, 1fr) ${width}px` } : undefined}
    >
      <div className={styles.mainArea}>{children}</div>
      {showAssistant ? (
        <aside className={`${styles.assistantArea} ${styles.assistantAreaOpen}`} style={{ position: "relative" }}>
          {/* Resize handle */}
          <div
            className={styles.resizeHandle}
            onMouseDown={onMouseDown}
            role="separator"
            aria-orientation="vertical"
            aria-label="채팅 패널 너비 조절"
            tabIndex={0}
          />
          {assistant}
        </aside>
      ) : null}
    </div>
  );
}
