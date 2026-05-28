import { getStore } from '@netlify/blobs';
import type { Settings } from '~/types/shared';
import settingsData from '~/data/settings.json';
import { DEFAULTS as MSG_DEFAULTS } from './messages';

const SETTINGS_STORE = 'settings';
const DYNAMIC_KEY = 'runtime.json';

interface DynamicSettings {
  bride_name: string;
  event_date: string;
  event_time: string;
  event_address: string;
  splash_title: string;
  splash_subtitle: string;
  reminder_message_template: string;
  thankyou_complete_message_template: string;
  thankyou_post_message_template: string;
}

const DYNAMIC_DEFAULTS: DynamicSettings = {
  bride_name: settingsData.bride_name,
  event_date: settingsData.event_date,
  event_time: settingsData.event_time,
  event_address: settingsData.event_address,
  splash_title: settingsData.splash_title,
  splash_subtitle: settingsData.splash_subtitle,
  reminder_message_template: MSG_DEFAULTS.reminder_message_template,
  thankyou_complete_message_template: MSG_DEFAULTS.thankyou_complete_message_template,
  thankyou_post_message_template: MSG_DEFAULTS.thankyou_post_message_template,
};

function mergeWithDefaults(dynamic: Partial<DynamicSettings>): Settings {
  return {
    bride_name: dynamic.bride_name ?? DYNAMIC_DEFAULTS.bride_name,
    event_date: dynamic.event_date ?? DYNAMIC_DEFAULTS.event_date,
    event_time: dynamic.event_time ?? DYNAMIC_DEFAULTS.event_time,
    event_address: dynamic.event_address ?? DYNAMIC_DEFAULTS.event_address,
    splash_title: dynamic.splash_title ?? DYNAMIC_DEFAULTS.splash_title,
    splash_subtitle: dynamic.splash_subtitle ?? DYNAMIC_DEFAULTS.splash_subtitle,
    reminder_message_template: dynamic.reminder_message_template ?? DYNAMIC_DEFAULTS.reminder_message_template,
    thankyou_complete_message_template: dynamic.thankyou_complete_message_template ?? DYNAMIC_DEFAULTS.thankyou_complete_message_template,
    thankyou_post_message_template: dynamic.thankyou_post_message_template ?? DYNAMIC_DEFAULTS.thankyou_post_message_template,
  };
}

/**
 * Síncrono. Retorna defaults do JSON estático (sem ler Blobs). Use só
 * em build-time / páginas pré-renderizadas que não precisam refletir
 * mudanças do painel admin.
 */
export function getSettings(): Settings {
  return mergeWithDefaults({});
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
 * Async. Mescla defaults com overrides do Blobs. Use em handlers de
 * API e páginas SSR (prerender=false).
 */
export async function getRuntimeSettings(): Promise<Settings> {
  const dynamic = await readDynamic();
  return mergeWithDefaults(dynamic);
}

export async function updateRuntimeSettings(patch: Partial<DynamicSettings>): Promise<Settings> {
  const current = await readDynamic();
  const next: Partial<DynamicSettings> = { ...current };
  for (const k of Object.keys(patch) as Array<keyof DynamicSettings>) {
    const v = patch[k];
    if (v === undefined) continue;
    (next as Record<string, unknown>)[k] = v;
  }
  await writeDynamic(next);
  return mergeWithDefaults(next);
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
