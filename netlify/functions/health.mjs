export default async () => Response.json({
  ok: true,
  app: "PaceScene",
  aiGatewayBaseConfigured: Boolean(Netlify.env.get("OPENAI_BASE_URL")),
  model: Netlify.env.get("OPENAI_MODEL") || "gpt-4o-mini"
}, { headers: { "Cache-Control": "no-store" } });

export const config = { path: "/api/health" };
