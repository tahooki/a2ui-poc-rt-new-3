import express from "express";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const load = (name: string) =>
  JSON.parse(readFileSync(join(__dirname, "fixtures", name), "utf-8"));

const app = express();
app.use(express.json());

// --- Fixtures ---
const services = load("services.json");
const deployments = load("deployments.json");
const approvals = load("approvals.json");
const incidents = load("incidents.json");

// --- Routes ---

// Services
app.get("/api/services", (_req, res) => {
  res.json({ services: services.services });
});

app.get("/api/services/:name", (req, res) => {
  const detail = services.details[req.params.name as keyof typeof services.details];
  if (!detail) return res.status(404).json({ error: "Service not found" });
  res.json(detail);
});

// Deployments
app.get("/api/deployments", (_req, res) => {
  res.json(deployments);
});

// Approvals
app.get("/api/approvals", (_req, res) => {
  const items = approvals.items;
  const byStatus: Record<string, number> = {};
  const byType: Record<string, number> = {};
  for (const item of items) {
    byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    byType[item.type] = (byType[item.type] ?? 0) + 1;
  }
  res.json({ items, byStatus, byType });
});

// Incidents / Rollback
app.get("/api/incidents", (_req, res) => {
  res.json(incidents);
});

// Actions
app.post("/api/actions/:type", (req, res) => {
  const { type } = req.params;
  const actions: Record<string, string> = {
    deploy: "배포가 시작되었습니다.",
    approve: "승인이 처리되었습니다.",
    rollback: "롤백이 실행되었습니다.",
  };
  res.json({
    ok: true,
    action: type,
    message: actions[type] ?? `${type} 액션이 처리되었습니다.`,
    timestamp: new Date().toISOString(),
  });
});

// Health
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const PORT = Number(process.env.PORT ?? 3200);
app.listen(PORT, () => {
  console.log(`A2UI Mock API running on http://localhost:${PORT}`);
});
