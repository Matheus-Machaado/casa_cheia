import { Resend } from 'resend';
import type { Reservation, Product, Settings } from '~/types/shared';
import { formatEventDateShort } from './settings';

function getClient() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY missing');
  return new Resend(key);
}

const FROM = process.env.RESEND_FROM_EMAIL || 'Casa Cheia <onboarding@resend.dev>';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL_NOTIFY || 'matheus.thosi@gmail.com';

function shellEmail(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width" />
<title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#FAFAFA;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;color:#09090B;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;padding:32px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E4E4E7;border-radius:16px;overflow:hidden;">
<tr><td style="padding:24px 28px;background:#09090B;color:#FFFFFF;">
<div style="display:flex;align-items:center;gap:12px;">
<span style="display:inline-block;width:36px;height:36px;background:#F43F5E;color:#FFF;border-radius:50%;line-height:36px;text-align:center;font-weight:700;font-size:18px;font-family:Georgia,serif;font-style:italic;">L</span>
<div>
<div style="font-weight:600;font-size:16px;">Casa Cheia</div>
<div style="font-size:11px;opacity:0.7;letter-spacing:0.08em;text-transform:uppercase;">chá da Lina</div>
</div>
</div>
</td></tr>
<tr><td style="padding:32px 28px;">
${bodyHtml}
</td></tr>
<tr><td style="padding:16px 28px;background:#F4F4F5;border-top:1px solid #E4E4E7;font-size:12px;color:#71717A;text-align:center;">
Casa Cheia · feito com carinho pra Lina
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export async function sendAdminNotification(r: Reservation, p: Product, s: Settings): Promise<{ id: string | null; error: string | null }> {
  const body = `
<h1 style="font-size:24px;line-height:1.2;font-weight:700;margin:0 0 16px;color:#09090B;">Nova reserva no Casa Cheia 🎉</h1>
<p style="font-size:14px;color:#52525B;margin:0 0 20px;"><strong>${r.guest_name}</strong> reservou <strong>${r.qty}×</strong> ${p.title}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#52525B;border:1px solid #E4E4E7;border-radius:8px;margin-bottom:20px;">
<tr><td style="padding:8px 12px;border-bottom:1px solid #E4E4E7;"><strong>Telefone</strong></td><td style="padding:8px 12px;border-bottom:1px solid #E4E4E7;">${r.guest_phone}</td></tr>
${r.message ? `<tr><td style="padding:8px 12px;"><strong>Mensagem</strong></td><td style="padding:8px 12px;font-style:italic;">"${r.message}"</td></tr>` : ''}
<tr><td style="padding:8px 12px;${r.message ? 'border-top:1px solid #E4E4E7;' : ''}"><strong>Data do chá</strong></td><td style="padding:8px 12px;${r.message ? 'border-top:1px solid #E4E4E7;' : ''}">${formatEventDateShort(s.event_date)} · ${s.event_time}</td></tr>
</table>
<a href="https://casacheia.netlify.app/admin" style="display:inline-block;background:#09090B;color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:13px;">Abrir painel admin</a>
`;
  try {
    const result = await getClient().emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `Nova reserva: ${r.guest_name} (${r.qty}× ${p.title})`,
      html: shellEmail('Nova reserva', body),
    });
    return { id: result.data?.id ?? null, error: result.error?.message ?? null };
  } catch (err) {
    return { id: null, error: (err as Error).message };
  }
}

/**
 * Notifica o admin quando a Lina cancela manualmente uma reserva. Não chega
 * pro convidado — o canal pro convidado agora é WhatsApp (manual via wa.me
 * ou broadcast se for o caso). Mantido pra registro/log interno.
 */
export async function sendCancellationToAdmin(r: Reservation, p: Product, _s: Settings): Promise<{ id: string | null; error: string | null }> {
  const body = `
<h1 style="font-size:22px;line-height:1.2;font-weight:700;margin:0 0 12px;color:#09090B;">Reserva cancelada</h1>
<p style="font-size:14px;color:#52525B;margin:0 0 16px;">A reserva de <strong>${r.guest_name}</strong> (${r.qty}× ${p.title}) foi cancelada.</p>
<p style="font-size:13px;color:#71717A;">Motivo: ${r.cancellation_reason || '—'}</p>
<p style="font-size:12px;color:#A1A1AA;margin-top:16px;">O contato com o convidado agora é via WhatsApp (botão no painel).</p>
`;
  try {
    const result = await getClient().emails.send({
      from: FROM,
      to: ADMIN_EMAIL,
      subject: `Reserva cancelada: ${r.guest_name}`,
      html: shellEmail('Reserva cancelada', body),
    });
    return { id: result.data?.id ?? null, error: result.error?.message ?? null };
  } catch (err) {
    return { id: null, error: (err as Error).message };
  }
}
