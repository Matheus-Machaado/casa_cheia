/**
 * Cliente GoTrue REST (Netlify Identity) — sem o widget JS oficial.
 * Mesmo padrão do Diamantina Trekking: UI custom + sessão em localStorage
 * + refresh automático do access_token antes de expirar.
 *
 * Fluxo de senha (criar/redefinir) vive em /conta. Aqui só disparamos o
 * /recover; o e-mail cai em /conta com hash do GoTrue (invite/recovery).
 */

const IDENTITY = typeof window === 'undefined' ? '' : window.location.origin + '/.netlify/identity';
const SESS_KEY = 'casacheia.admin.session';

export interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  email: string;
}

let session: Session | null = null;

function load(): Session | null {
  if (session) return session;
  if (typeof window === 'undefined') return null;
  try {
    session = JSON.parse(localStorage.getItem(SESS_KEY) || 'null');
  } catch {
    session = null;
  }
  return session;
}

function persist(s: Session | null) {
  session = s;
  if (typeof window === 'undefined') return;
  if (s) localStorage.setItem(SESS_KEY, JSON.stringify(s));
  else localStorage.removeItem(SESS_KEY);
}

function decodeJwt(tok: string): Record<string, unknown> {
  try {
    const p = tok.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(decodeURIComponent(escape(atob(p))));
  } catch {
    return {};
  }
}

interface RawTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number | string;
  user?: { email?: string };
}

function shape(data: RawTokenResponse): Session {
  const claims = decodeJwt(data.access_token || '') as { email?: string; exp?: number };
  const expIn = Number(data.expires_in || (claims.exp ? claims.exp - Math.floor(Date.now() / 1000) : 3600));
  return {
    access_token: data.access_token || '',
    refresh_token: data.refresh_token || '',
    expires_at: Date.now() + Math.max(60, expIn) * 1000,
    email: claims.email || data.user?.email || '',
  };
}

/**
 * Primeiro contato vindo do e-mail: a /conta define a senha e redireciona
 * pro /admin#access_token=...&refresh_token=...&expires_in=... — esta
 * função adota a sessão diretamente, sem segunda tela de login. Em
 * acessos futuros (sem hash) cai no login normal.
 */
export function adoptHashSession(): boolean {
  if (typeof window === 'undefined') return false;
  const h = (window.location.hash || '').replace(/^#/, '');
  if (!h) return false;
  const p = new URLSearchParams(h);
  const at = p.get('access_token');
  if (!at) return false;
  persist(shape({
    access_token: at,
    refresh_token: p.get('refresh_token') || '',
    expires_in: p.get('expires_in') || undefined,
  }));
  try {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } catch {
    window.location.hash = '';
  }
  return true;
}

async function tokenRequest(body: string): Promise<RawTokenResponse> {
  const res = await fetch(IDENTITY + '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  let data: RawTokenResponse & { error_description?: string; msg?: string; error?: string } = {};
  try {
    data = await res.json();
  } catch {/* sem corpo */}
  if (!res.ok) {
    const m = data.error_description || data.msg || data.error || '';
    const friendly = /invalid|grant|password|credentials/i.test(m + res.status)
      ? 'E-mail ou senha incorretos.'
      : (m || 'Não foi possível entrar. Tente novamente.');
    throw new Error(friendly);
  }
  return data;
}

export async function login(email: string, password: string): Promise<Session> {
  const body = 'grant_type=password&username=' + encodeURIComponent(email) +
    '&password=' + encodeURIComponent(password);
  const data = await tokenRequest(body);
  const s = shape(data);
  if (!s.email) s.email = email;
  persist(s);
  return s;
}

async function refresh(): Promise<Session> {
  const s = load();
  if (!s || !s.refresh_token) throw new Error('no-session');
  const data = await tokenRequest('grant_type=refresh_token&refresh_token=' + encodeURIComponent(s.refresh_token));
  const next = shape(data);
  if (!next.email) next.email = s.email;
  persist(next);
  return next;
}

/** Token válido pra chamar APIs admin (refresh se faltar < 90s). */
export async function getAccessToken(): Promise<string> {
  const s = load();
  if (!s) throw new Error('no-session');
  if (Date.now() > s.expires_at - 90000) {
    try {
      return (await refresh()).access_token;
    } catch {
      logout();
      throw new Error('session-expired');
    }
  }
  return s.access_token;
}

export function currentUser(): { email: string } | null {
  const s = load();
  return s ? { email: s.email } : null;
}

export function isLoggedIn(): boolean {
  return !!load();
}

export function logout(): void {
  const s = load();
  if (s && s.access_token) {
    fetch(IDENTITY + '/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + s.access_token },
    }).catch(() => {/* best-effort */});
  }
  persist(null);
}

/** Dispara o e-mail de redefinição de senha. Cai em /conta com recovery_token. */
export async function requestRecovery(email: string): Promise<void> {
  const res = await fetch(IDENTITY + '/recover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!res.ok && res.status !== 200) {
    let d: { msg?: string; error_description?: string } | null = null;
    try { d = await res.json(); } catch {/* */}
    throw new Error((d?.msg || d?.error_description) || 'Não foi possível enviar o e-mail.');
  }
}

/**
 * Aceita um invite_token vindo do e-mail e define senha (primeiro acesso).
 * Retorna a sessão já autenticada.
 */
export async function verifyInvite(token: string, password: string): Promise<Session> {
  const res = await fetch(IDENTITY + '/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password, type: 'signup' }),
  });
  let data: RawTokenResponse & { msg?: string; error_description?: string } = {};
  try { data = await res.json(); } catch {/* */}
  if (!res.ok) {
    throw new Error(data.msg || data.error_description || 'Não foi possível confirmar o convite.');
  }
  const s = shape(data);
  persist(s);
  return s;
}

/**
 * Aceita um recovery_token + define nova senha. Retorna sessão.
 */
export async function verifyRecovery(token: string, password: string): Promise<Session> {
  const verifyRes = await fetch(IDENTITY + '/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, type: 'recovery' }),
  });
  let v: RawTokenResponse & { msg?: string; error_description?: string } = {};
  try { v = await verifyRes.json(); } catch {/* */}
  if (!verifyRes.ok || !v.access_token) {
    throw new Error(v.msg || v.error_description || 'Sessão de recuperação inválida. Peça um novo link.');
  }
  const updateRes = await fetch(IDENTITY + '/user', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + v.access_token,
    },
    body: JSON.stringify({ password }),
  });
  if (!updateRes.ok) {
    let d: { msg?: string; error_description?: string } | null = null;
    try { d = await updateRes.json(); } catch {/* */}
    throw new Error(d?.msg || d?.error_description || 'Não foi possível salvar a senha.');
  }
  const s = shape(v);
  persist(s);
  return s;
}

/**
 * Wrapper de fetch que injeta `Authorization: Bearer <token>` e lida com
 * 401 (sessão expirou → logout + reload). Use em todos os fetches do
 * painel admin.
 */
export async function authFetch(input: string, init: RequestInit = {}): Promise<Response> {
  let token: string;
  try {
    token = await getAccessToken();
  } catch {
    if (typeof window !== 'undefined') window.location.reload();
    throw new Error('session-expired');
  }
  const headers = new Headers(init.headers || {});
  headers.set('Authorization', 'Bearer ' + token);
  const res = await fetch(input, { ...init, headers });
  if (res.status === 401 && typeof window !== 'undefined') {
    logout();
    window.location.reload();
  }
  return res;
}

/**
 * Confirma email (link com confirmation_token). Não loga necessariamente.
 */
export async function verifyConfirmation(token: string): Promise<void> {
  const res = await fetch(IDENTITY + '/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, type: 'signup' }),
  });
  if (!res.ok) {
    let d: { msg?: string; error_description?: string } | null = null;
    try { d = await res.json(); } catch {/* */}
    throw new Error(d?.msg || d?.error_description || 'Não foi possível confirmar.');
  }
}
