/**
 * Validação de token Identity no server-side. Functions v2 (Astro
 * adapter) NÃO populam `context.clientContext.user` automaticamente —
 * isso é só v1 legacy. Aqui validamos o Bearer token chamando o
 * endpoint `/.netlify/identity/user` (GoTrue valida JWT + retorna user).
 *
 * Latência: ~50-150ms por request. Pra um painel admin de evento
 * pessoal isso é OK.
 */
export interface AdminUser {
  email: string;
  sub?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

export async function requireAdminUser(request: Request): Promise<AdminUser | null> {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.toLowerCase().startsWith('bearer ')) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;

  // Quick check do JWT exp (evita roundtrip pra tokens expirados óbvios).
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))))
    );
    if (payload.exp && payload.exp * 1000 < Date.now()) return null;
  } catch {
    return null;
  }

  // Valida assinatura + busca user atualizado via GoTrue.
  try {
    const url = new URL(request.url);
    const identityUrl = url.origin + '/.netlify/identity/user';
    const res = await fetch(identityUrl, {
      headers: { Authorization: auth },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AdminUser & { email?: string };
    if (!data.email) return null;
    return data;
  } catch {
    return null;
  }
}
