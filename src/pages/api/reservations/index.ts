import type { APIRoute } from 'astro';
import { json, errorResponse, readClientIp } from '~/lib/api';
import { ReservationCreateSchema } from '~/lib/validation';
import { getAllProducts, getProductById } from '~/lib/products';
import { getRuntimeSettings, markThankYouSent } from '~/lib/settings';
import {
  putReservation,
  getProductCounter,
  updateProductCounter,
  checkRateLimit,
  listReservationsByStatus,
  listAllReservations,
  computeTotalProgress,
} from '~/lib/blobs';
import { sendAdminNotification } from '~/lib/email';
import { sendThankYouWhatsApp } from '~/lib/whatsapp';
import { hashIp } from '~/lib/identity';
import type { Reservation, CreateReservationResponse, ActivityLogEntry } from '~/types/shared';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return errorResponse('BAD_REQUEST', 'JSON inválido', 400);
  }

  const parsed = ReservationCreateSchema.safeParse(payload);
  if (!parsed.success) {
    const firstErr = parsed.error.issues[0];
    return errorResponse('BAD_REQUEST', firstErr.message, 400, {
      field: firstErr.path.join('.'),
    });
  }

  const input = parsed.data;

  const ip = readClientIp(request);
  const rl = await checkRateLimit('create-reservation', ip, 5, 60);
  if (!rl.ok) {
    return errorResponse('RATE_LIMITED', 'Muitas reservas em pouco tempo. Aguarda um pouco.', 429, {
      retry_after: rl.retryAfter,
    });
  }

  const product = getProductById(input.product_id);
  if (!product) {
    return errorResponse('NOT_FOUND', 'Presente não encontrado', 404);
  }
  if (!product.active) {
    return errorResponse('CONFLICT', 'Esse presente não está mais disponível', 409);
  }

  const counter = await getProductCounter(product.id, product.qty_desejada);
  const available = product.qty_desejada - counter.qty_reservada;
  if (input.qty > available) {
    return errorResponse('CONFLICT', `Só ${available} unidade(s) disponível(eis) agora.`, 409, {
      available,
    });
  }

  const now = new Date().toISOString();
  const reservation: Reservation = {
    _v: 1,
    id: crypto.randomUUID(),
    product_id: product.id,
    guest_name: input.guest_name,
    guest_email: null,
    guest_phone: input.guest_phone,
    qty: input.qty,
    message: input.message ?? null,
    status: 'confirmada',
    created_at: now,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    reminder_sent_at: null,
    thankyou_sent_at: null,
    activity_log: [],
    ip_hash: hashIp(ip),
    user_agent_hash: hashIp(request.headers.get('user-agent') || ''),
  };

  await putReservation(reservation);
  await updateProductCounter(product.id, product.qty_desejada, input.qty);

  const settings = await getRuntimeSettings();

  // Notifica Lina por email (canal admin). Não bloqueia em erro — log.
  const adminEmail = await sendAdminNotification(reservation, product, settings).catch(
    (e) => ({ id: null, error: (e as Error).message }),
  );
  reservation.activity_log.push({
    channel: 'email',
    type: 'admin-notification',
    sent_at: new Date().toISOString(),
    to: 'admin',
    provider_message_id: adminEmail.id,
    error: adminEmail.error,
  });
  await putReservation(reservation);

  // Fire-and-forget: se a lista bateu 100%, dispara agradecimento por
  // WhatsApp pra TODOS os números únicos confirmados. Idempotente via flag
  // `thankyou_sent` no settings.
  if (!settings.thankyou_sent && settings.thankyou_enabled && settings.whatsapp_enabled) {
    triggerThankYouIfComplete().catch((err) => {
      console.error('[thankyou] trigger failed:', (err as Error).message);
    });
  }

  const response: CreateReservationResponse = {
    id: reservation.id,
    product_id: reservation.product_id,
    qty: reservation.qty,
    status: reservation.status,
    created_at: reservation.created_at,
    guest_name: reservation.guest_name,
  };

  return json({ data: response }, 201, { 'Cache-Control': 'no-store' });
};

export const GET: APIRoute = async ({ request, locals }) => {
  // Identity gating via Netlify clientContext
  const user = (locals as { netlify?: { context?: { clientContext?: { user?: { email: string; app_metadata?: { roles?: string[] } } } } } }).netlify?.context?.clientContext?.user;
  if (!user) {
    return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get('status') || 'confirmada';
  const product_id = url.searchParams.get('product_id');

  const reservations = status === 'all'
    ? await listAllReservations()
    : await listReservationsByStatus(status);

  const filtered = product_id ? reservations.filter((r) => r.product_id === product_id) : reservations;

  return json({ data: filtered }, 200, { 'Cache-Control': 'no-store, private' });
};

/**
 * Dispara agradecimento via WhatsApp pra todos os números únicos confirmados,
 * uma vez só (idempotente via settings.thankyou_sent). Roda em background.
 */
async function triggerThankYouIfComplete(): Promise<void> {
  const settings = await getRuntimeSettings();
  if (settings.thankyou_sent || !settings.thankyou_enabled || !settings.whatsapp_enabled) return;

  const expected = getAllProducts()
    .filter((p) => p.active)
    .map((p) => ({ id: p.id, qty_desejada: p.qty_desejada }));
  const progress = await computeTotalProgress(expected);
  if (!progress.complete) return;

  // Re-checa flag depois do trabalho (race window).
  const fresh = await getRuntimeSettings();
  if (fresh.thankyou_sent) return;

  await markThankYouSent();

  const all = await listReservationsByStatus('confirmada');
  const seenPhones = new Set<string>();
  for (const r of all) {
    if (!r.guest_phone) continue;
    if (seenPhones.has(r.guest_phone)) continue;
    seenPhones.add(r.guest_phone);
    const result = await sendThankYouWhatsApp(r, fresh);
    const entry: ActivityLogEntry = {
      channel: 'whatsapp',
      type: 'thankyou',
      sent_at: new Date().toISOString(),
      to: r.guest_phone,
      provider_message_id: result.id,
      error: result.error,
    };
    r.activity_log.push(entry);
    if (!result.error && !result.skipped) {
      r.thankyou_sent_at = entry.sent_at;
    }
    await putReservation(r);
  }
}
