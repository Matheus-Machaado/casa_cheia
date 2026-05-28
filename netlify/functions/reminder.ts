import type { Config } from '@netlify/functions';
import { listReservationsByStatus, updateReservation } from '../../src/lib/blobs';
import { getProductById } from '../../src/lib/products';
import { getRuntimeSettings } from '../../src/lib/settings';
import { sendReminderWhatsApp } from '../../src/lib/whatsapp';
import type { ActivityLogEntry } from '../../src/types/shared';

export default async () => {
  const settings = await getRuntimeSettings();

  if (!settings.reminder_enabled) {
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 0, reason: 'reminder_disabled' }));
  }
  if (!settings.whatsapp_enabled) {
    return new Response(JSON.stringify({ ok: true, sent: 0, skipped: 0, reason: 'whatsapp_disabled' }));
  }

  // event_date "YYYY-MM-DD" + event_time "HH:MM" em horário local (BRT, -03)
  const [year, month, day] = settings.event_date.split('-').map(Number);
  const [hour, minute] = settings.event_time.split(':').map(Number);
  const eventLocal = new Date(Date.UTC(year, month - 1, day, hour + 3, minute));
  const now = new Date();
  const hoursUntilEvent = (eventLocal.getTime() - now.getTime()) / (60 * 60 * 1000);

  const target = settings.reminder_hours_before;
  // Cron roda 1×/hora. Janela de match: [target, target + 1) horas.
  // Garante que cada reserva seja avaliada exatamente uma vez no ponto certo.
  const inWindow = hoursUntilEvent <= target && hoursUntilEvent > target - 1;

  if (!inWindow) {
    return new Response(JSON.stringify({
      ok: true,
      sent: 0,
      skipped: 0,
      reason: 'outside-window',
      hours_until_event: Math.round(hoursUntilEvent * 10) / 10,
      target,
    }));
  }

  const reservations = await listReservationsByStatus('confirmada');
  const pending = reservations.filter((r) => r.reminder_sent_at === null && r.guest_phone);

  let sent = 0;
  let errors = 0;
  let skipped = 0;

  // De-dup por phone (Lina dá presente a 1 convidado por número, mas se ele
  // reservou múltiplos itens, só recebe 1 lembrete consolidado).
  const phonesContacted = new Set<string>();

  for (const r of pending) {
    if (phonesContacted.has(r.guest_phone)) {
      skipped++;
      r.reminder_sent_at = new Date().toISOString();
      await updateReservation(r);
      continue;
    }
    const product = getProductById(r.product_id);
    if (!product) { errors++; continue; }

    const result = await sendReminderWhatsApp(r, product, settings);
    const entry: ActivityLogEntry = {
      channel: 'whatsapp',
      type: 'reminder',
      sent_at: new Date().toISOString(),
      to: r.guest_phone,
      provider_message_id: result.id,
      error: result.error,
    };
    r.activity_log.push(entry);

    if (result.error) {
      errors++;
    } else if (result.skipped) {
      skipped++;
    } else {
      sent++;
      r.reminder_sent_at = entry.sent_at;
      phonesContacted.add(r.guest_phone);
    }
    await updateReservation(r);
  }

  return new Response(JSON.stringify({
    ok: true,
    sent,
    errors,
    skipped,
    total_candidates: pending.length,
    hours_until_event: Math.round(hoursUntilEvent * 10) / 10,
    target,
  }));
};

// Cron 1×/hora. A função decide internamente se dispara ou não, baseado em
// `reminder_hours_before` configurado no painel.
export const config: Config = {
  schedule: '0 * * * *',
};
