import type { APIRoute } from 'astro';
import { json, errorResponse } from '~/lib/api';
import { ReservationActionSchema } from '~/lib/validation';
import { getReservation, updateReservation, updateProductCounter } from '~/lib/blobs';
import { getProductById } from '~/lib/products';
import { getSettings } from '~/lib/settings';
import { sendCancellation } from '~/lib/email';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request, locals }) => {
  const user = (locals as { netlify?: { context?: { clientContext?: { user?: { email: string } } } } }).netlify?.context?.clientContext?.user;
  if (!user) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);

  const id = params.id;
  if (!id) return errorResponse('BAD_REQUEST', 'ID faltando', 400);

  let payload: unknown;
  try { payload = await request.json(); } catch { return errorResponse('BAD_REQUEST', 'JSON inválido', 400); }

  const parsed = ReservationActionSchema.safeParse(payload);
  if (!parsed.success) return errorResponse('BAD_REQUEST', parsed.error.issues[0].message, 400);

  const { action, reason } = parsed.data;

  const reservation = await getReservation(id);
  if (!reservation) return errorResponse('NOT_FOUND', 'Reserva não encontrada', 404);

  const product = getProductById(reservation.product_id);
  if (!product) return errorResponse('NOT_FOUND', 'Produto associado não encontrado', 404);

  const previousStatus = reservation.status;

  if (action === 'cancel') {
    if (reservation.status === 'cancelada') {
      return errorResponse('CONFLICT', 'Reserva já está cancelada', 409);
    }
    reservation.status = 'cancelada';
    reservation.cancelled_at = new Date().toISOString();
    reservation.cancelled_by = user.email;
    reservation.cancellation_reason = reason ?? null;
    await updateReservation(reservation, previousStatus);
    await updateProductCounter(product.id, product.qty_desejada, -reservation.qty);

    const settings = getSettings();
    const emailResult = await sendCancellation(reservation, product, settings).catch((e) => ({ id: null, error: (e as Error).message }));
    reservation.email_log.push({
      type: 'cancellation',
      sent_at: new Date().toISOString(),
      resend_message_id: emailResult.id,
      to: reservation.guest_email,
      error: emailResult.error,
    });
    await updateReservation(reservation);
  } else if (action === 'restore') {
    if (reservation.status === 'confirmada') {
      return errorResponse('CONFLICT', 'Reserva já está confirmada', 409);
    }
    // Verify availability before restoring
    const { getProductCounter } = await import('~/lib/blobs');
    const counter = await getProductCounter(product.id, product.qty_desejada);
    const available = product.qty_desejada - counter.qty_reservada;
    if (reservation.qty > available) {
      return errorResponse('CONFLICT', `Sem qty disponível pra restaurar (${available} livre, precisa ${reservation.qty})`, 409);
    }
    reservation.status = 'confirmada';
    reservation.cancelled_at = null;
    reservation.cancelled_by = null;
    reservation.cancellation_reason = null;
    await updateReservation(reservation, previousStatus);
    await updateProductCounter(product.id, product.qty_desejada, reservation.qty);
  }

  return json({ data: reservation }, 200, { 'Cache-Control': 'no-store' });
};
