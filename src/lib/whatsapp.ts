import type { Reservation, Product, Settings } from '~/types/shared';
import { unformatPhone } from './format';
import { formatEventDate } from './settings';

const DEFAULT_REMINDER_TEMPLATE = `Oi, {nome}! 🤍

Lembrete amoroso: o chá de casa nova da Lina é {quando} ({data} às {hora}). Você reservou {qty}× {produto} — se ainda não passou na Amazon pra comprar, dá uma corridinha 💕

Endereço: {endereco}

Conto com você! Beijo, Lina`;

const DEFAULT_THANKYOU_TEMPLATE = `Oi, {nome}! 🤍

A lista do meu chá tá COMPLETA — cada um de vocês fez parte de encher o nosso apê novo. Não sei nem como agradecer.

Quando estiver tudo organizadinho, eu posto o resultado no site pra você ver como ficou:
https://casacheia.netlify.app

Obrigada de verdade. Beijo!
Lina`;

export const DEFAULTS = {
  reminder_hours_before: 24,
  reminder_message_template: DEFAULT_REMINDER_TEMPLATE,
  thankyou_message_template: DEFAULT_THANKYOU_TEMPLATE,
} as const;

export interface WhatsAppSendResult {
  id: string | null;
  error: string | null;
  skipped?: 'disabled' | 'no-credentials';
}

function getConfig() {
  return {
    apiUrl: process.env.EVOLUTION_API_URL,
    apiKey: process.env.EVOLUTION_API_KEY,
    instance: process.env.EVOLUTION_INSTANCE_NAME,
  };
}

function isConfigured(): boolean {
  const c = getConfig();
  return Boolean(c.apiUrl && c.apiKey && c.instance);
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function toIntlPhone(rawPhone: string): string {
  const digits = unformatPhone(rawPhone);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? `{${key}}` : String(v);
  });
}

function buildWhenLabel(hoursBefore: number): string {
  if (hoursBefore <= 2) return 'em poucas horas';
  if (hoursBefore <= 6) return `daqui {h}h`.replace('{h}', String(hoursBefore));
  if (hoursBefore <= 18) return 'mais tarde hoje';
  if (hoursBefore <= 30) return 'amanhã';
  const days = Math.round(hoursBefore / 24);
  return `em ${days} dias`;
}

export function buildReminderVars(
  r: Reservation,
  p: Product,
  s: Settings,
): Record<string, string | number> {
  return {
    nome: getFirstName(r.guest_name),
    nome_completo: r.guest_name,
    produto: p.title,
    qty: r.qty,
    data: formatEventDate(s.event_date),
    hora: s.event_time,
    endereco: s.event_address,
    quando: buildWhenLabel(s.reminder_hours_before),
    horas: s.reminder_hours_before,
    bride: s.bride_name,
  };
}

export function buildThankYouVars(
  r: Reservation,
  s: Settings,
): Record<string, string | number> {
  return {
    nome: getFirstName(r.guest_name),
    nome_completo: r.guest_name,
    bride: s.bride_name,
  };
}

async function sendText(phone: string, text: string): Promise<WhatsAppSendResult> {
  if (!isConfigured()) {
    return { id: null, error: null, skipped: 'no-credentials' };
  }
  const { apiUrl, apiKey, instance } = getConfig();
  const number = toIntlPhone(phone);
  const url = `${apiUrl!.replace(/\/$/, '')}/message/sendText/${instance}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: apiKey!,
      },
      body: JSON.stringify({ number, text }),
    });
    const body = (await res.json().catch(() => ({}))) as { key?: { id?: string }; error?: string; message?: string };
    if (!res.ok) {
      return { id: null, error: body.error || body.message || `HTTP ${res.status}` };
    }
    return { id: body.key?.id ?? null, error: null };
  } catch (err) {
    return { id: null, error: (err as Error).message };
  }
}

export async function sendReminderWhatsApp(
  r: Reservation,
  p: Product,
  s: Settings,
): Promise<WhatsAppSendResult> {
  if (!s.whatsapp_enabled || !s.reminder_enabled) {
    return { id: null, error: null, skipped: 'disabled' };
  }
  const template = s.reminder_message_template || DEFAULT_REMINDER_TEMPLATE;
  const text = renderTemplate(template, buildReminderVars(r, p, s));
  return sendText(r.guest_phone, text);
}

export async function sendThankYouWhatsApp(
  r: Reservation,
  s: Settings,
): Promise<WhatsAppSendResult> {
  if (!s.whatsapp_enabled || !s.thankyou_enabled) {
    return { id: null, error: null, skipped: 'disabled' };
  }
  const template = s.thankyou_message_template || DEFAULT_THANKYOU_TEMPLATE;
  const text = renderTemplate(template, buildThankYouVars(r, s));
  return sendText(r.guest_phone, text);
}

export function whatsAppHealth(): { configured: boolean; missing: string[] } {
  const c = getConfig();
  const missing: string[] = [];
  if (!c.apiUrl) missing.push('EVOLUTION_API_URL');
  if (!c.apiKey) missing.push('EVOLUTION_API_KEY');
  if (!c.instance) missing.push('EVOLUTION_INSTANCE_NAME');
  return { configured: missing.length === 0, missing };
}
