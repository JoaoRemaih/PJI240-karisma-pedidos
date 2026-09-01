import { createFileRoute } from "@tanstack/react-router";
import { fetchCepAddress, isValidCep } from "@/lib/karisma/cep";

const WINDOW_MS = 60_000;
const LIMIT = 30;
const buckets = new Map<string, { n: number; t: number }>();

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "local";
}

function allow(key: string): boolean {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || now - current.t > WINDOW_MS) {
    buckets.set(key, { n: 1, t: now });
    return true;
  }
  if (current.n >= LIMIT) return false;
  current.n += 1;
  return true;
}

export const Route = createFileRoute("/api/cep/$cep")({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        if (!allow(clientKey(request))) {
          return Response.json(
            { error: "Muitas consultas. Espere um minuto." },
            { status: 429, headers: { "Cache-Control": "no-store" } },
          );
        }
        const cep = params.cep ?? "";
        if (!isValidCep(cep)) {
          return Response.json(
            { error: "CEP inválido" },
            { status: 400, headers: { "Cache-Control": "no-store" } },
          );
        }
        const addr = await fetchCepAddress(cep);
        if (!addr) {
          return Response.json(
            { error: "CEP não encontrado" },
            { status: 404, headers: { "Cache-Control": "no-store" } },
          );
        }
        return Response.json(addr, {
          headers: { "Cache-Control": "public, max-age=86400" },
        });
      },
    },
  },
});
