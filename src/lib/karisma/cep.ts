import type { CepAddress } from "./types";

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

export function formatCep(value: string): string {
  const d = onlyDigits(value).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function isValidCep(value: string): boolean {
  return onlyDigits(value).length === 8;
}

export function parseCepResponse(data: unknown): CepAddress | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (row.erro === true || row.erro === "true") return null;
  // ViaCEP
  if (typeof row.localidade === "string" && typeof row.uf === "string") {
    return {
      cep: formatCep(typeof row.cep === "string" ? row.cep : ""),
      street: typeof row.logradouro === "string" ? row.logradouro : "",
      neighborhood: typeof row.bairro === "string" ? row.bairro : "",
      city: row.localidade,
      state: row.uf,
    };
  }
  // BrasilAPI / OpenCEP
  if (typeof row.city === "string" && typeof row.state === "string") {
    return {
      cep: formatCep(typeof row.cep === "string" ? row.cep : ""),
      street: typeof row.street === "string" ? row.street : "",
      neighborhood: typeof row.neighborhood === "string" ? row.neighborhood : "",
      city: row.city,
      state: row.state,
    };
  }
  return null;
}

export function viaCepUrl(cep: string): string {
  return `https://viacep.com.br/ws/${onlyDigits(cep)}/json/`;
}

export function brasilApiCepUrl(cep: string): string {
  return `https://brasilapi.com.br/api/cep/v1/${onlyDigits(cep)}`;
}

export async function fetchCepAddress(cep: string): Promise<CepAddress | null> {
  const urls = [viaCepUrl(cep), brasilApiCepUrl(cep)];
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) continue;
      const json: unknown = await res.json();
      const addr = parseCepResponse(json);
      if (addr) return addr;
    } catch {
      /* tenta a próxima API */
    }
  }
  return null;
}
