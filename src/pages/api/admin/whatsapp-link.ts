import type { APIRoute } from 'astro';
import { json, errorResponse } from '~/lib/api';
import { getReservation, updateReservation } from '~/lib/blobs';
import { getProductById } from '~/lib/products';
import { getRuntimeSettings } from '~/lib/settings';
import { buildVars, renderTemplate, templateForKind } from '~/lib/messages';
import { MessageKindSchema } from '~/lib/validation';
import { requireAdminUser } from '~/lib/serverAuth';
import type { WhatsAppLinkResponse, ActivityLogEntry, MessageKind } from '~/types/shared';
import { unformatPhone } from '~/lib/format';

export const prerender = false;

interface RequestBody {
  reservation_id?: string;
  kind?: MessageKind;
}

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdminUser(request))) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);

  let body: RequestBody;
  try { body = await request.json(); } catch { return errorResponse('BAD_REQUEST', 'JSON inválido', 400); }
  if (!body.reservation_id) return errorResponse('BAD_REQUEST', 'reservation_id obrigatório', 400);

  const kindParsed = MessageKindSchema.safeParse(body.kind ?? 'reminder');
  if (!kindParsed.success) return errorResponse('BAD_REQUEST', 'kind inválido', 400);
  const kind = kindParsed.data;

  const r = await getReservation(body.reservation_id);
  if (!r) return errorResponse('NOT_FOUND', 'Reserva não encontrada', 404);
  if (!r.guest_phone) return errorResponse('BAD_REQUEST', 'Convidado não tem telefone', 400);

  const p = getProductById(r.product_id);
  if (!p) return errorResponse('NOT_FOUND', 'Produto não encontrado', 404);

  const s = await getRuntimeSettings();
  const template = templateForKind(s, kind);
  const message = renderTemplate(template, buildVars(r, p, s));

  const phone = unformatPhone(r.guest_phone);
  const intl = phone.length === 11 || phone.length === 10 ? `55${phone}` : phone;
  const url = `https://wa.me/${intl}?text=${encodeURIComponent(message)}`;

  const entry: ActivityLogEntry = {
    channel: 'whatsapp',
    type: 'whatsapp-link-generated',
    sent_at: new Date().toISOString(),
    to: r.guest_phone,
    provider_message_id: null,
    error: null,
    kind,
  };
  r.activity_log.push(entry);
  await updateReservation(r);

  const response: WhatsAppLinkResponse = { url, message };
  return json({ data: response }, 200);
};
