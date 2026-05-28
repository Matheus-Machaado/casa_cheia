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
  event_cep: string;
  event_street: string;
  event_number: string;
  event_complement: string;
  event_neighborhood: string;
  event_city: string;
  event_state: string;
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
  event_cep: settingsData.event_cep,
  event_street: settingsData.event_street,
  event_number: settingsData.event_number,
  event_complement: settingsData.event_complement,
  event_neighborhood: settingsData.event_neighborhood,
  event_city: settingsData.event_city,
  event_state: settingsData.event_state,
  splash_title: settingsData.splash_title,
  splash_subtitle: settingsData.splash_subtitle,
  reminder_message_template: MSG_DEFAULTS.reminder_message_template,
  thankyou_complete_message_template: MSG_DEFAULTS.thankyou_complete_message_template,
  thankyou_post_message_template: MSG_DEFAULTS.thankyou_post_message_template,
};

/**
 * Concatena os campos atômicos em uma string única "Rua, Nº — Complemento, Bairro, Cidade/UF".
 * Pula segmentos vazios pra ficar elegante.
 */
function buildEventAddress(d: DynamicSettings): string {
  const street = d.event_street?.trim();
  const number = d.event_number?.trim();
  const complement = d.event_complement?.trim();
  const neighborhood = d.event_neighborhood?.trim();
  const city = d.event_city?.trim();
  const state = d.event_state?.trim();

  const first = [street, number].filter(Boolean).join(', ');
  const withComplement = complement ? `${first} — ${complement}` : first;
  const cityState = [city, state].filter(Boolean).join('/');
  const tail = [neighborhood, cityState].filter(Boolean).join(', ');
  return [withComplement, tail].filter(Boolean).join(', ');
}

function mergeWithDefaults(dynamic: Partial<DynamicSettings>): Settings {
  const d: DynamicSettings = {
    bride_name: dynamic.bride_name ?? DYNAMIC_DEFAULTS.bride_name,
    event_date: dynamic.event_date ?? DYNAMIC_DEFAULTS.event_date,
    event_time: dynamic.event_time ?? DYNAMIC_DEFAULTS.event_time,
    event_cep: dynamic.event_cep ?? DYNAMIC_DEFAULTS.event_cep,
    event_street: dynamic.event_street ?? DYNAMIC_DEFAULTS.event_street,
    event_number: dynamic.event_number ?? DYNAMIC_DEFAULTS.event_number,
    event_complement: dynamic.event_complement ?? DYNAMIC_DEFAULTS.event_complement,
    event_neighborhood: dynamic.event_neighborhood ?? DYNAMIC_DEFAULTS.event_neighborhood,
    event_city: dynamic.event_city ?? DYNAMIC_DEFAULTS.event_city,
    event_state: dynamic.event_state ?? DYNAMIC_DEFAULTS.event_state,
    splash_title: dynamic.splash_title ?? DYNAMIC_DEFAULTS.splash_title,
    splash_subtitle: dynamic.splash_subtitle ?? DYNAMIC_DEFAULTS.splash_subtitle,
    reminder_message_template: dynamic.reminder_message_template ?? DYNAMIC_DEFAULTS.reminder_message_template,
    thankyou_complete_message_template: dynamic.thankyou_complete_message_template ?? DYNAMIC_DEFAULTS.thankyou_complete_message_template,
    thankyou_post_message_template: dynamic.thankyou_post_message_template ?? DYNAMIC_DEFAULTS.thankyou_post_message_template,
  };
  return {
    ...d,
    event_address: buildEventAddress(d),
  };
}

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
