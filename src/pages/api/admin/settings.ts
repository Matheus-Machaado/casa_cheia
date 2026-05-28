import type { APIRoute } from 'astro';
import { json, errorResponse } from '~/lib/api';
import { SettingsUpdateSchema } from '~/lib/validation';
import { getRuntimeSettings, updateRuntimeSettings, resetThankYouFlag } from '~/lib/settings';
import { whatsAppHealth } from '~/lib/whatsapp';

export const prerender = false;

function requireUser(locals: unknown) {
  return (locals as { netlify?: { context?: { clientContext?: { user?: { email: string } } } } }).netlify?.context?.clientContext?.user;
}

export const GET: APIRoute = async ({ locals }) => {
  if (!requireUser(locals)) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);
  const settings = await getRuntimeSettings();
  const wa = whatsAppHealth();
  return json({
    data: {
      settings,
      whatsapp_health: wa,
    },
  }, 200, { 'Cache-Control': 'no-store, private' });
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

  // Apenas os campos dinâmicos (editáveis via runtime). Campos estáticos
  // (bride_name, event_date, etc) são ignorados aqui — vivem no settings.json
  // de build-time.
  const next = await updateRuntimeSettings({
    reminder_enabled: parsed.data.reminder_enabled,
    reminder_hours_before: parsed.data.reminder_hours_before,
    reminder_message_template: parsed.data.reminder_message_template,
    thankyou_enabled: parsed.data.thankyou_enabled,
    thankyou_message_template: parsed.data.thankyou_message_template,
    whatsapp_enabled: parsed.data.whatsapp_enabled,
  });

  return json({ data: next }, 200, { 'Cache-Control': 'no-store, private' });
};

/**
 * Permite a Lina re-disparar o agradecimento (caso teste). Body vazio.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  if (!requireUser(locals)) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);
  const url = new URL(request.url);
  if (url.searchParams.get('action') === 'reset-thankyou') {
    await resetThankYouFlag();
    return json({ data: { ok: true } }, 200, { 'Cache-Control': 'no-store, private' });
  }
  return errorResponse('BAD_REQUEST', 'Ação desconhecida', 400);
};
