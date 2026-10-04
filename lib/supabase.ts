import "server-only";

export function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) throw new Error("Configure SUPABASE_URL e SUPABASE_ANON_KEY no servidor.");
  return { url, anonKey };
}

// Backend for frontend: the browser never receives the privileged key.
// RLS denies direct access; every application route checks its own authorization.
export async function backend(path: string, init: RequestInit = {}) {
  const { url } = config();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Configure SUPABASE_SERVICE_ROLE_KEY no servidor.");
  const headers = new Headers(init.headers);
  headers.set("apikey", key);
  // Legacy service_role JWT needs Authorization; sb_secret keys use apikey alone.
  if (!key.startsWith("sb_secret_")) headers.set("Authorization", `Bearer ${key}`);
  const response = await fetch(url + path, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(20000) });
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}));
    if (detail.code === "23505") throw new Error("Este registro já existe. Atualize a página antes de tentar novamente.");
    throw new Error("Não foi possível acessar o banco ou os laudos. Confira a configuração do Supabase.");
  }
  return response;
}

export async function authRequest(path: string, init: RequestInit = {}) {
  const { url, anonKey } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", anonKey);
  return fetch(url + "/auth/v1/" + path, { ...init, headers, cache: "no-store", signal: AbortSignal.timeout(15000) });
}
