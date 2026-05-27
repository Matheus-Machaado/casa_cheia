import type { Context } from '@netlify/functions';

export interface IdentityUser {
  email: string;
  sub: string;
  app_metadata?: { roles?: string[] };
  user_metadata?: Record<string, unknown>;
}

export function getUserFromContext(ctx: Context): IdentityUser | null {
  const user = (ctx as { clientContext?: { user?: IdentityUser } }).clientContext?.user;
  return user ?? null;
}

export function isAdmin(user: IdentityUser | null): boolean {
  if (!user) return false;
  return user.app_metadata?.roles?.includes('admin') ?? true;
}

export function hashIp(ip: string, salt = 'casacheia-v1'): string {
  // Web Crypto API (available in Functions runtime)
  const data = new TextEncoder().encode(salt + ip);
  return Array.from(new Uint8Array(data)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
