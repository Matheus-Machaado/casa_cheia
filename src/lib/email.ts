import { Resend } from 'resend';
import type { Reservation, Product, Settings } from '~/types/shared';
import { formatBRL } from './format';
import { formatEventDate } from './settings';

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

export async function sendGuestConfirmation(r: Reservation, p: Product, s: Settings): Promise<{ id: string | null; error: string | null }> {
  const total = p.price_brl_cents ? p.price_brl_cents * r.qty : null;
  const body = `
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#E11D48;font-weight:700;margin-bottom:8px;">reserva confirmada</div>
<h1 style="font-size:28px;line-height:1.2;font-weight:700;margin:0 0 8px;color:#09090B;font-family:Georgia,serif;">Obrigada, <em>${r.guest_name}!</em></h1>
<p style="font-size:15px;line-height:1.6;color:#52525B;margin:0 0 24px;">Sua reserva foi confirmada na hora 🎉. Compra no link abaixo quando puder e traz no dia do chá da Lina.</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E4E4E7;border-radius:12px;margin-bottom:20px;">
<tr>
<td width="80" style="padding:16px;background:#F4F4F5;border-right:1px solid #E4E4E7;text-align:center;">
<img src="${p.image_url}" alt="${p.title}" width="64" height="64" style="max-width:64px;max-height:64px;object-fit:contain;" />
</td>
<td style="padding:16px;">
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#71717A;font-weight:700;margin-bottom:4px;">${p.room}</div>
<div style="font-size:15px;font-weight:600;color:#09090B;line-height:1.3;margin-bottom:4px;">${p.title}</div>
<div style="font-size:13px;color:#52525B;">Qty: <strong>${r.qty}</strong>${total ? ` · Total ${formatBRL(total)}` : ''}</div>
</td>
</tr>
</table>

<a href="${p.amazon_url}" style="display:block;background:#F43F5E;color:#FFFFFF;text-decoration:none;text-align:center;padding:14px 24px;border-radius:12px;font-weight:600;font-size:15px;margin-bottom:24px;">Ver na Amazon</a>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;border-radius:12px;padding:16px;font-size:13px;color:#52525B;line-height:1.6;">
<tr><td>
<strong style="color:#09090B;">Chá da Lina</strong><br>
${formatEventDate(s.event_date)} · ${s.event_time}<br>
${s.event_address}
</td></tr>
</table>

${r.guest_phone ? `<p style="font-size:12px;color:#A1A1AA;margin-top:24px;text-align:center;">Vou te lembrar 1 dia antes pelo email 💌</p>` : ''}
`;
  try {
    const result = await getClient().emails.send({
      from: FROM,
      to: r.guest_email,
      subject: `Reserva confirmada · chá da ${s.bride_name}`,
      html: shellEmail('Reserva confirmada', body),
    });
    return { id: result.data?.id ?? null, error: result.error?.message ?? null };
  } catch (err) {
    return { id: null, error: (err as Error).message };
  }
}

export async function sendAdminNotification(r: Reservation, p: Product, s: Settings): Promise<{ id: string | null; error: string | null }> {
  const body = `
<h1 style="font-size:24px;line-height:1.2;font-weight:700;margin:0 0 16px;color:#09090B;">Nova reserva no Casa Cheia 🎉</h1>
<p style="font-size:14px;color:#52525B;margin:0 0 20px;"><strong>${r.guest_name}</strong> reservou <strong>${r.qty}×</strong> ${p.title}.</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#52525B;border:1px solid #E4E4E7;border-radius:8px;margin-bottom:20px;">
<tr><td style="padding:8px 12px;border-bottom:1px solid #E4E4E7;"><strong>Email</strong></td><td style="padding:8px 12px;border-bottom:1px solid #E4E4E7;">${r.guest_email}</td></tr>
<tr><td style="padding:8px 12px;border-bottom:1px solid #E4E4E7;"><strong>Telefone</strong></td><td style="padding:8px 12px;border-bottom:1px solid #E4E4E7;">${r.guest_phone || '—'}</td></tr>
${r.message ? `<tr><td style="padding:8px 12px;"><strong>Mensagem</strong></td><td style="padding:8px 12px;font-style:italic;">"${r.message}"</td></tr>` : ''}
</table>
<a href="https://casacheia.netlify.app/admin/reservas" style="display:inline-block;background:#09090B;color:#FFFFFF;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600;font-size:13px;">Abrir painel admin</a>
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

export async function sendReminder(r: Reservation, p: Product, s: Settings): Promise<{ id: string | null; error: string | null }> {
  const body = `
<div style="font-size:11px;text-transform:uppercase;letter-spacing:0.12em;color:#E11D48;font-weight:700;margin-bottom:8px;">lembrete · amanhã</div>
<h1 style="font-size:28px;line-height:1.2;font-weight:700;margin:0 0 8px;color:#09090B;font-family:Georgia,serif;">Amanhã é o chá da <em>${s.bride_name}</em>!</h1>
<p style="font-size:15px;line-height:1.6;color:#52525B;margin:0 0 24px;">Não esquece de trazer <strong>${p.title}</strong> (${r.qty}×). Beijo!</p>

<a href="${p.amazon_url}" style="display:block;background:#F43F5E;color:#FFFFFF;text-decoration:none;text-align:center;padding:14px 24px;border-radius:12px;font-weight:600;font-size:15px;margin-bottom:24px;">Ver na Amazon</a>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F4F5;border-radius:12px;padding:16px;font-size:13px;color:#52525B;line-height:1.6;">
<tr><td>
<strong style="color:#09090B;">Detalhes</strong><br>
${formatEventDate(s.event_date)} · ${s.event_time}<br>
${s.event_address}
</td></tr>
</table>
`;
  try {
    const result = await getClient().emails.send({
      from: FROM,
      to: r.guest_email,
      subject: `Amanhã é o chá da ${s.bride_name}!`,
      html: shellEmail('Lembrete', body),
    });
    return { id: result.data?.id ?? null, error: result.error?.message ?? null };
  } catch (err) {
    return { id: null, error: (err as Error).message };
  }
}

export async function sendCancellation(r: Reservation, p: Product, s: Settings): Promise<{ id: string | null; error: string | null }> {
  const body = `
<h1 style="font-size:24px;line-height:1.2;font-weight:700;margin:0 0 16px;color:#09090B;">Sua reserva foi ajustada pela ${s.bride_name}</h1>
<p style="font-size:15px;line-height:1.6;color:#52525B;margin:0 0 16px;">Oi ${r.guest_name}! A ${s.bride_name} cancelou sua reserva de <strong>${p.title}</strong>. Pode ser por algum ajuste interno — sem problema, fica à vontade pra escolher outro presente.</p>
<a href="https://casacheia.netlify.app/presentes" style="display:inline-block;background:#F43F5E;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:12px;font-weight:600;font-size:15px;">Ver outros presentes</a>
`;
  try {
    const result = await getClient().emails.send({
      from: FROM,
      to: r.guest_email,
      subject: `Sua reserva foi ajustada`,
      html: shellEmail('Reserva ajustada', body),
    });
    return { id: result.data?.id ?? null, error: result.error?.message ?? null };
  } catch (err) {
    return { id: null, error: (err as Error).message };
  }
}
