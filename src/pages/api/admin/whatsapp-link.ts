import type { APIRoute } from 'astro';
import { json, errorResponse } from '~/lib/api';
import { getReservation } from '~/lib/blobs';
import { getProductById } from '~/lib/products';
import { getSettings, formatEventDateShort } from '~/lib/settings';
import type { WhatsAppLinkResponse } from '~/types/shared';
import { unformatPhone } from '~/lib/format';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const user = (locals as { netlify?: { context?: { clientContext?: { user?: { email: string } } } } }).netlify?.context?.clientContext?.user;
  if (!user) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);

  let body: { reservation_id?: string };
  try { body = await request.json(); } catch { return errorResponse('BAD_REQUEST', 'JSON inválido', 400); }
  if (!body.reservation_id) return errorResponse('BAD_REQUEST', 'reservation_id obrigatório', 400);

  const r = await getReservation(body.reservation_id);
  if (!r) return errorResponse('NOT_FOUND', 'Reserva não encontrada', 404);
  if (!r.guest_phone) return errorResponse('BAD_REQUEST', 'Convidado não tem telefone', 400);

  const p = getProductById(r.product_id);
  if (!p) return errorResponse('NOT_FOUND', 'Produto não encontrado', 404);

  const s = getSettings();
  const date = formatEventDateShort(s.event_date);
  const message = `Oi ${r.guest_name}! Lembrando do meu chá de casa nova amanhã (${date}) às ${s.event_time} em ${s.event_address}. Você ia trazer ${p.title}. Beijo, ${s.bride_name} 🤍`;

  const phone = unformatPhone(r.guest_phone);
  const intl = phone.length === 11 || phone.length === 10 ? `55${phone}` : phone;
  const url = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;

  const response: WhatsAppLinkResponse = { url, message };
  return json({ data: response }, 200);
};
