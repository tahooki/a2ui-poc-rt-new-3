"use client";

import { useState } from "react";
import { SurfaceRenderer } from "@a2ui/ui";
import { registerBuiltinTemplates } from "@a2ui/ui/templates/register-all";
import type { SurfaceEnvelope } from "@a2ui/ui";

registerBuiltinTemplates();

type ResolveResponse = {
  envelope?: SurfaceEnvelope & {
    meta?: {
      catalogTemplateId?: string;
      resolverTrace?: string[];
    };
  };
  error?: string;
  trace?: Array<{ id: string; status: string; error?: string }>;
};

export default function ComponentSmokePage() {
  const [templateId, setTemplateId] = useState("component_smoke_fulltest");
  const [adminUrl, setAdminUrl] = useState("http://localhost:3101");
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [status, setStatus] = useState("Idle");
  const [actions, setActions] = useState<string[]>([]);

  async function loadSurface() {
    setStatus("Loading");
    setResult(null);
    const params = new URLSearchParams({ templateId, adminUrl });
    const response = await fetch(`/api/a2ui-smoke/resolve?${params.toString()}`);
    const data = (await response.json()) as ResolveResponse;
    setResult(data);
    setStatus(response.ok && data.envelope ? "Rendered" : "Failed");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1220",
        color: "#e4e8ef",
        fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif",
        padding: 32,
      }}
    >
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, margin: "0 0 6px", fontWeight: 850 }}>
          A2UI Component Smoke Renderer
        </h1>
        <p style={{ color: "#8b9ab5", margin: "0 0 24px", fontSize: 14 }}>
          Loads an Admin catalog template, resolves it through the MCP runtime, and renders the registered React component.
        </p>

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr) auto",
            gap: 10,
            alignItems: "end",
            padding: 16,
            background: "rgba(17,24,39,.8)",
            border: "1px solid rgba(37,50,68,.76)",
            borderRadius: 8,
            marginBottom: 18,
          }}
        >
          <label style={{ display: "grid", gap: 6, color: "#8b9ab5", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
            Template ID
            <input
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              style={{ background: "#0d1520", border: "1px solid rgba(37,50,68,.76)", borderRadius: 6, color: "#e4e8ef", padding: "9px 10px", fontSize: 13 }}
            />
          </label>
          <label style={{ display: "grid", gap: 6, color: "#8b9ab5", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>
            Admin URL
            <input
              value={adminUrl}
              onChange={(event) => setAdminUrl(event.target.value)}
              style={{ background: "#0d1520", border: "1px solid rgba(37,50,68,.76)", borderRadius: 6, color: "#e4e8ef", padding: "9px 10px", fontSize: 13 }}
            />
          </label>
          <button
            type="button"
            onClick={loadSurface}
            style={{ background: "#5b8dee", color: "#fff", border: 0, borderRadius: 6, padding: "10px 16px", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
          >
            Load surface
          </button>
        </section>

        <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center" }}>
          <span style={{ color: status === "Rendered" ? "#34c38f" : status === "Failed" ? "#f46a6a" : "#8b9ab5", fontWeight: 800 }}>
            {status}
          </span>
          {result?.envelope?.meta?.catalogTemplateId && (
            <span style={{ color: "#8b9ab5", fontSize: 13 }}>
              catalogTemplateId: {result.envelope.meta.catalogTemplateId}
            </span>
          )}
        </div>

        {result?.error && (
          <pre style={{ background: "#1a1a2e", color: "#f46a6a", padding: 16, borderRadius: 8, overflow: "auto" }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        )}

        {result?.envelope && (
          <SurfaceRenderer
            envelope={result.envelope}
            onAction={(event) => {
              setActions((prev) => [`${event.actionId}:${event.kind}`, ...prev]);
            }}
          />
        )}

        {actions.length > 0 && (
          <section style={{ marginTop: 18, background: "#111827", border: "1px solid rgba(37,50,68,.76)", borderRadius: 8, padding: 14 }}>
            <div style={{ color: "#8b9ab5", fontSize: 11, fontWeight: 800, textTransform: "uppercase", marginBottom: 8 }}>
              Action Log
            </div>
            {actions.map((action, index) => (
              <div key={`${action}-${index}`} style={{ color: "#34c38f", fontFamily: "monospace", fontSize: 12 }}>
                {action}
              </div>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
