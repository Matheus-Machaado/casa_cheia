import type { Reservation, Product, Settings, MessageKind } from '~/types/shared';
import { formatEventDate } from './settings';

const DEFAULT_REMINDER_TEMPLATE = `Oi, {nome}! 🤍

Lembrete carinhoso: o chá de casa nova da Lina é {data} às {hora} em {endereco}.

Você reservou {qty}× {produto} — se ainda não passou na Amazon pra comprar, dá uma corridinha 💕

Conto com você! Beijo, Lina`;

const DEFAULT_THANKYOU_COMPLETE_TEMPLATE = `Oi, {nome}! 🤍

Notícia incrível: a lista do meu chá tá COMPLETA antes do tempo! Cada um de vocês fez parte de encher o nosso apê novo, não sei nem como agradecer.

Vem comemorar comigo no dia {data} às {hora} em {endereco}. Conto com a sua presença pra brindar tudo isso!

Beijo, Lina 💕`;

const DEFAULT_THANKYOU_POST_TEMPLATE = `Oi, {nome}! 🤍

Muito obrigada pela presença no meu chá de casa nova e por ter me ajudado com {qty}× {produto} — fez total diferença pra deixar o apê pronto.

Quando estiver tudo organizadinho, eu posto o resultado no site:
https://casacheia.netlify.app

Beijo, Lina`;

export const DEFAULTS = {
  reminder_message_template: DEFAULT_REMINDER_TEMPLATE,
  thankyou_complete_message_template: DEFAULT_THANKYOU_COMPLETE_TEMPLATE,
  thankyou_post_message_template: DEFAULT_THANKYOU_POST_TEMPLATE,
} as const;

function getFirstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function renderTemplate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = vars[key];
    return v === undefined || v === null ? `{${key}}` : String(v);
  });
}

export function buildVars(
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
    bride: s.bride_name,
  };
}

export function templateForKind(s: Settings, kind: MessageKind): string {
  switch (kind) {
    case 'reminder':
      return s.reminder_message_template || DEFAULT_REMINDER_TEMPLATE;
    case 'thankyou-complete':
      return s.thankyou_complete_message_template || DEFAULT_THANKYOU_COMPLETE_TEMPLATE;
    case 'thankyou-post':
      return s.thankyou_post_message_template || DEFAULT_THANKYOU_POST_TEMPLATE;
  }
}
