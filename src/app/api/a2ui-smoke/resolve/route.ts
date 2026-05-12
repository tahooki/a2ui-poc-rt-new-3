export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const templateId = url.searchParams.get("templateId") ?? "component_smoke_fulltest";
  const adminUrl = url.searchParams.get("adminUrl") ?? "http://localhost:3101";
  const endpoint = `${adminUrl.replace(/\/$/, "")}/admin/templates/${encodeURIComponent(templateId)}/simulate`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      intentKey: `${templateId}.start`,
      facts: {},
    }),
    cache: "no-store",
  });

  const data = await response.json();
  return Response.json(data, { status: response.status });
}
