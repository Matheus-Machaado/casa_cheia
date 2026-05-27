import type { Settings } from '~/types/shared';
import settingsData from '~/data/settings.json';

export function getSettings(): Settings {
  return settingsData as Settings;
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
