import type { Config, Context } from '@netlify/functions';
import { listReservationsByStatus, updateReservation } from '../../src/lib/blobs';
import { getProductById } from '../../src/lib/products';
import { getSettings } from '../../src/lib/settings';
import { sendReminder } from '../../src/lib/email';

export default async (req: Request, context: Context) => {
  const settings = getSettings();
  if (!settings.reminder_enabled) {
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 0, reason: 'reminder_disabled' }));
  }

  const eventDate = new Date(settings.event_date + 'T12:00:00');
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const daysUntilEvent = Math.round((eventDate.getTime() - now.getTime()) / oneDay);

  // Run on day before AND day of (safety)
  if (daysUntilEvent !== 1 && daysUntilEvent !== 0) {
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 0, reason: 'not-event-window', daysUntilEvent }));
  }

  const reservations = await listReservationsByStatus('confirmada');
  const pending = reservations.filter((r) => r.reminder_sent_at === null);

  let sent = 0;
  let errors = 0;

  for (const r of pending) {
    const product = getProductById(r.product_id);
    if (!product) { errors++; continue; }

    const result = await sendReminder(r, product, settings);
    if (result.error) {
      errors++;
      r.email_log.push({ type: 'reminder', sent_at: new Date().toISOString(), resend_message_id: null, to: r.guest_email, error: result.error });
    } else {
      sent++;
      r.reminder_sent_at = new Date().toISOString();
      r.email_log.push({ type: 'reminder', sent_at: r.reminder_sent_at, resend_message_id: result.id, to: r.guest_email, error: null });
    }
    await updateReservation(r);
  }

  return new Response(JSON.stringify({ ok: true, sent, errors, skipped: reservations.length - pending.length, daysUntilEvent }));
};

export const config: Config = {
  schedule: '0 12 * * *', // 9h BRT = 12h UTC
};
