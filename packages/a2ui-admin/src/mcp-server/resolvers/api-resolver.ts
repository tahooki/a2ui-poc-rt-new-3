/**
 * API Resolver — Mock API에 HTTP 호출
 */

const MOCK_API_BASE = process.env.MOCK_API_URL ?? "http://localhost:3200";

export type ApiResolverConfig = {
  endpoint: string;
  method?: "GET" | "POST";
  paramMapping?: Record<string, string>;
};

export async function executeApiResolver(
  config: ApiResolverConfig,
  context: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let url = `${MOCK_API_BASE}${config.endpoint}`;

  // Replace path params like :name
  if (config.paramMapping) {
    for (const [param, contextKey] of Object.entries(config.paramMapping)) {
      const value = context[contextKey];
      if (value) {
        url = url.replace(`:${param}`, String(value));
      }
    }
  }

  const response = await fetch(url, { method: config.method ?? "GET" });
  if (!response.ok) {
    throw new Error(`API resolver failed: ${response.status} ${url}`);
  }
  return response.json() as Promise<Record<string, unknown>>;
}
