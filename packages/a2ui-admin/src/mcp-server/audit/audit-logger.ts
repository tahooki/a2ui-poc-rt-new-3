/**
 * Audit Logger — resolver chain 실행 기록 (in-memory + JSONL 파일)
 */

import { appendFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export type AuditEntry = {
  timestamp: string;
  templateId: string;
  resolvers: Array<{
    name: string;
    durationMs: number;
    success: boolean;
    error?: string;
  }>;
  bindingSuccess: boolean;
  validationSuccess: boolean;
  validationErrors?: string[];
};

const logs: AuditEntry[] = [];
const LOG_FILE = join(process.cwd(), "audit-log.jsonl");

export function logAudit(entry: AuditEntry): void {
  logs.push(entry);
  try {
    appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf-8");
  } catch {
    // 파일 쓰기 실패 시 콘솔에만 출력
  }
  console.log(`[audit] ${entry.templateId} — ${entry.validationSuccess ? "OK" : "FAIL"} (${entry.resolvers.length} resolvers)`);
}

export function getAuditLogs(): AuditEntry[] {
  return [...logs];
}

export function loadAuditLogsFromFile(): AuditEntry[] {
  if (!existsSync(LOG_FILE)) return [];
  try {
    const content = readFileSync(LOG_FILE, "utf-8").trim();
    if (!content) return [];
    return content.split("\n").map((line) => JSON.parse(line) as AuditEntry);
  } catch {
    return [];
  }
}
