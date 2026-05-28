/**
 * Máscaras de input padronizadas — sempre que houver tipo (BRL, telefone,
 * CPF, CEP, etc.), usar isso. Nunca deixar input "livre" pra dado
 * estruturado.
 */

const MAX_PRICE_CENTS = 99_999_99; // R$ 99.999,99 — sanity limit

/**
 * Máscara monetária BRL. Trata cada dígito como centavos:
 *   "1"     -> "0,01"
 *   "199"   -> "1,99"
 *   "59990" -> "599,90"
 *   "123456789" -> "1.234.567,89"
 *
 * Aceita strings que já contêm pontuação (re-aplica o format).
 * Limite hard em MAX_PRICE_CENTS.
 */
export function applyBRLMask(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8); // max 8 dígitos = R$ 999.999,99
  if (!digits) return '';
  const cents = Math.min(parseInt(digits, 10), MAX_PRICE_CENTS);
  return formatCentsAsBRL(cents);
}

/**
 * Formata centavos como string BRL sem o "R$ " na frente (pra usar dentro
 * de input controlado). Ex: 59990 -> "599,90", 1234567 -> "12.345,67"
 */
export function formatCentsAsBRL(cents: number): string {
  const safe = Math.max(0, Math.min(cents, MAX_PRICE_CENTS));
  const int = Math.floor(safe / 100);
  const dec = safe % 100;
  const intStr = int.toLocaleString('pt-BR');
  const decStr = String(dec).padStart(2, '0');
  return `${intStr},${decStr}`;
}

/**
 * Lê uma string formatada (com pontos e vírgula) e retorna centavos como
 * inteiro. Retorna null se vazia.
 */
export function parseBRLToCents(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return null;
  const cents = parseInt(digits, 10);
  if (!isFinite(cents) || cents < 0) return null;
  return Math.min(cents, MAX_PRICE_CENTS);
}

export const PRICE_BRL_INPUT_MAX_LENGTH = 12; // "999.999,99" + folga
