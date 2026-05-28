import { getStore } from '@netlify/blobs';
import type { Settings } from '~/types/shared';
import settingsData from '~/data/settings.json';
import { DEFAULTS as WA_DEFAULTS } from './whatsapp';

const SETTINGS_STORE = 'settings';
const DYNAMIC_KEY = 'runtime.json';

interface DynamicSettings {
  reminder_enabled: boolean;
  reminder_hours_before: number;
  reminder_message_template: string;
  thankyou_enabled: boolean;
  thankyou_message_template: string;
  thankyou_sent: boolean;
  thankyou_sent_at: string | null;
  whatsapp_enabled: boolean;
}

const DYNAMIC_DEFAULTS: DynamicSettings = {
  reminder_enabled: true,
  reminder_hours_before: WA_DEFAULTS.reminder_hours_before,
  reminder_message_template: WA_DEFAULTS.reminder_message_template,
  thankyou_enabled: true,
  thankyou_message_template: WA_DEFAULTS.thankyou_message_template,
  thankyou_sent: false,
  thankyou_sent_at: null,
  whatsapp_enabled: false,
};

function mergeWithDefaults(base: typeof settingsData, dynamic: Partial<DynamicSettings>): Settings {
  return {
    bride_name: base.bride_name,
    event_date: base.event_date,
    event_time: base.event_time,
    event_address: base.event_address,
    splash_title: base.splash_title,
    splash_subtitle: base.splash_subtitle,
    reminder_enabled: dynamic.reminder_enabled ?? DYNAMIC_DEFAULTS.reminder_enabled,
    reminder_hours_before: dynamic.reminder_hours_before ?? DYNAMIC_DEFAULTS.reminder_hours_before,
    reminder_message_template: dynamic.reminder_message_template ?? DYNAMIC_DEFAULTS.reminder_message_template,
    thankyou_enabled: dynamic.thankyou_enabled ?? DYNAMIC_DEFAULTS.thankyou_enabled,
    thankyou_message_template: dynamic.thankyou_message_template ?? DYNAMIC_DEFAULTS.thankyou_message_template,
    thankyou_sent: dynamic.thankyou_sent ?? DYNAMIC_DEFAULTS.thankyou_sent,
    thankyou_sent_at: dynamic.thankyou_sent_at ?? DYNAMIC_DEFAULTS.thankyou_sent_at,
    whatsapp_enabled: dynamic.whatsapp_enabled ?? DYNAMIC_DEFAULTS.whatsapp_enabled,
  };
}

/**
 * Síncrono. Usado em páginas estáticas (build-time) e templates Astro.
 * Não enxerga overrides do Blobs — mostra defaults. Para handlers/functions,
 * use {@link getRuntimeSettings}.
 */
export function getSettings(): Settings {
  return mergeWithDefaults(settingsData, {});
}

function store() {
  return getStore({ name: SETTINGS_STORE, consistency: 'strong' });
}

async function readDynamic(): Promise<Partial<DynamicSettings>> {
  try {
    const data = (await store().get(DYNAMIC_KEY, { type: 'json' })) as Partial<DynamicSettings> | null;
    return data ?? {};
  } catch {
    return {};
  }
}

async function writeDynamic(next: Partial<DynamicSettings>): Promise<void> {
  await store().setJSON(DYNAMIC_KEY, next);
}

/**
 * Async. Usado em handlers de API e Netlify Functions. Mescla JSON estático
 * com overrides do Blobs.
 */
export async function getRuntimeSettings(): Promise<Settings> {
  const dynamic = await readDynamic();
  return mergeWithDefaults(settingsData, dynamic);
}

/**
 * Atualiza apenas campos dinâmicos. Campos do JSON estático são ignorados
 * (build-time only). Retorna o Settings completo pós-merge.
 */
export async function updateRuntimeSettings(patch: Partial<DynamicSettings>): Promise<Settings> {
  const current = await readDynamic();
  const next: Partial<DynamicSettings> = { ...current };
  for (const k of Object.keys(patch) as Array<keyof DynamicSettings>) {
    const v = patch[k];
    if (v === undefined) continue;
    (next as Record<string, unknown>)[k] = v;
  }
  await writeDynamic(next);
  return mergeWithDefaults(settingsData, next);
}

export async function markThankYouSent(): Promise<void> {
  const current = await readDynamic();
  await writeDynamic({
    ...current,
    thankyou_sent: true,
    thankyou_sent_at: new Date().toISOString(),
  });
}

export async function resetThankYouFlag(): Promise<void> {
  const current = await readDynamic();
  await writeDynamic({
    ...current,
    thankyou_sent: false,
    thankyou_sent_at: null,
  });
}

export function formatEventDate(iso: string): string {
  const date = new Date(iso + 'T12:00:00');
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const weekday = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][date.getDay()];
  return `${date.getDate()} de ${months[date.getMonth()]}, ${date.getFullYear()} · ${weekday}`;
}

export function formatEventDateShort(iso: string): string {
  const date = new Date(iso + 'T12:00:00');
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  return `${date.getDate()} ${months[date.getMonth()]}`;
}
