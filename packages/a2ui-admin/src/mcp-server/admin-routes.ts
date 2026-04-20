/**
 * Admin REST API — template catalog CRUD + simulate
 */

import { Router } from "express";
import {
  readAllTemplates,
  readTemplate,
  writeTemplate,
  deleteTemplate,
  normalizeTemplate,
  validateStoredTemplate,
  type StoredTemplateRegistration,
} from "./catalog/template-store.js";
import { evaluateDecision } from "./decision/decision-engine.js";
import { resolveTemplateById } from "./runtime/resolve-template.js";

export const adminRouter = Router();

// List all templates (summary)
adminRouter.get("/admin/templates", (_req, res) => {
  const templates = readAllTemplates().map(({ templateId, version, title, status, description }) => ({
    templateId,
    version,
    title,
    status,
    description,
  }));
  res.json(templates);
});

// Get single template (full registration)
adminRouter.get("/admin/templates/:templateId", (req, res) => {
  const template = readTemplate(req.params.templateId);
  if (!template) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json(template);
});

// Create new template
adminRouter.post("/admin/templates", (req, res) => {
  const data = normalizeTemplate(req.body as StoredTemplateRegistration);
  const errors = validateStoredTemplate(data);
  if (errors.length > 0) {
    res.status(400).json({ error: "Validation failed", details: errors });
    return;
  }
  const existing = readTemplate(data.templateId);
  if (existing) {
    res.status(409).json({ error: `Template ${data.templateId} already exists` });
    return;
  }
  writeTemplate(data.templateId, data);
  res.status(201).json({ ok: true, templateId: data.templateId });
});

// Update existing template
adminRouter.put("/admin/templates/:templateId", (req, res) => {
  const { templateId } = req.params;
  const data = normalizeTemplate({ ...(req.body as StoredTemplateRegistration), templateId });
  const errors = validateStoredTemplate(data);
  if (errors.length > 0) {
    res.status(400).json({ error: "Validation failed", details: errors });
    return;
  }
  writeTemplate(templateId, data);
  res.json({ ok: true, templateId });
});

// Delete template
adminRouter.delete("/admin/templates/:templateId", (req, res) => {
  const deleted = deleteTemplate(req.params.templateId);
  if (!deleted) {
    res.status(404).json({ error: "Template not found" });
    return;
  }
  res.json({ ok: true });
});

// Simulate: run recommend + resolve chain with given facts
adminRouter.post("/admin/templates/:templateId/simulate", async (req, res) => {
  const { templateId } = req.params;
  const { intentKey, facts } = req.body as { intentKey?: string; facts?: Record<string, unknown> };

  // Step 1: Decision (if intentKey provided)
  let decision = null;
  if (intentKey) {
    decision = evaluateDecision(intentKey, facts ?? {});
  }

  const result = await resolveTemplateById(templateId, {
    ...(facts ?? {}),
    ...(intentKey ? { intentKey } : {}),
  });

  if (result.error && result.error === "Template not found") {
    res.status(404).json({ error: "Template not found" });
    return;
  }

  res.json({
    decision,
    envelope: result.envelope,
    validation: result.validation,
    resolverData: result.resolverData,
    trace: result.trace,
    error: result.error,
  });
});
