export function formatBRL(cents: number | null): string {
  if (cents == null) return 'a combinar';
  return 'R$ ' + (cents / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatPhoneBR(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export function unformatPhone(formatted: string): string {
  return formatted.replace(/\D/g, '');
}

export function isValidPhoneBR(formatted: string): boolean {
  const d = unformatPhone(formatted);
  return d.length === 10 || d.length === 11;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function buildAmazonShortUrl(dp: string): string {
  return `https://www.amazon.com.br/dp/${dp}`;
}
