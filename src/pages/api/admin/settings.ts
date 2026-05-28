import type { APIRoute } from 'astro';
import { json, errorResponse } from '~/lib/api';
import { SettingsUpdateSchema } from '~/lib/validation';
import { getRuntimeSettings, updateRuntimeSettings } from '~/lib/settings';

export const prerender = false;

function requireUser(locals: unknown) {
  return (locals as { netlify?: { context?: { clientContext?: { user?: { email: string } } } } }).netlify?.context?.clientContext?.user;
}

export const GET: APIRoute = async ({ locals }) => {
  if (!requireUser(locals)) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);
  const settings = await getRuntimeSettings();
  return json({ data: { settings } }, 200, { 'Cache-Control': 'no-store, private' });
};

export const PATCH: APIRoute = async ({ request, locals }) => {
  if (!requireUser(locals)) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('BAD_REQUEST', 'JSON inválido', 400);
  }

  const parsed = SettingsUpdateSchema.safeParse(payload);
  if (!parsed.success) {
    return errorResponse('BAD_REQUEST', parsed.error.issues[0].message, 400, {
      field: parsed.error.issues[0].path.join('.'),
    });
  }

  const next = await updateRuntimeSettings(parsed.data);
  return json({ data: next }, 200, { 'Cache-Control': 'no-store, private' });
};
