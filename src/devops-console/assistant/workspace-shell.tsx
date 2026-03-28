"use client";

import { useState } from "react";
import styles from "@/devops-console/console-page.module.css";

type WorkspaceShellProps = {
  workspace: React.ReactNode;
  debugDrawer: React.ReactNode;
  statusBanner?: React.ReactNode;
};

/**
 * WorkspaceShell: wraps the main workspace area with an optional
 * debug drawer and status banner. Debug drawer is hidden by default.
 */
export function WorkspaceShell({
  workspace,
  debugDrawer,
  statusBanner,
}: WorkspaceShellProps) {
  const [debugOpen, setDebugOpen] = useState(false);

  return (
    <div className={styles.workspaceShell}>
      {statusBanner}
      <div className={styles.workspaceShellBody}>
        <div className={styles.workspaceShellMain}>
          {workspace}
        </div>
        {debugOpen ? (
          <div className={styles.workspaceShellDrawer} role="complementary" aria-label="Debug drawer">
            <div className={styles.workspaceShellDrawerHeader}>
              <span className={styles.sectionEyebrow}>Debug</span>
              <button
                className={styles.iconButton}
                onClick={() => setDebugOpen(false)}
                type="button"
                aria-label="Close debug drawer"
              >
                ✕
              </button>
            </div>
            {debugDrawer}
          </div>
        ) : null}
      </div>
      <button
        className={styles.debugToggle}
        onClick={() => setDebugOpen((prev) => !prev)}
        type="button"
        aria-label={debugOpen ? "Close debug drawer" : "Open debug drawer"}
        aria-expanded={debugOpen}
      >
        {debugOpen ? "Debug ▸" : "◂ Debug"}
      </button>
    </div>
  );
}
