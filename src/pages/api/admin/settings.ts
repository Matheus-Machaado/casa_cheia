import type { APIRoute } from 'astro';
import { json, errorResponse } from '~/lib/api';
import { SettingsUpdateSchema } from '~/lib/validation';
import { getRuntimeSettings, updateRuntimeSettings } from '~/lib/settings';
import { requireAdminUser } from '~/lib/serverAuth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!(await requireAdminUser(request))) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);
  const settings = await getRuntimeSettings();
  return json({ data: { settings } }, 200, { 'Cache-Control': 'no-store, private' });
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!(await requireAdminUser(request))) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);

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
