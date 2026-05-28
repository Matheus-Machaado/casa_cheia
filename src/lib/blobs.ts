import { getStore } from '@netlify/blobs';
import type { Reservation, ProductAvailability } from '~/types/shared';

const RESERVATIONS_STORE = 'reservations';

function store() {
  return getStore({ name: RESERVATIONS_STORE, consistency: 'strong' });
}

export async function putReservation(r: Reservation): Promise<void> {
  const s = store();
  await s.setJSON(`reservations/${r.id}.json`, r);
  await s.setJSON(`indexes/by-product/${r.product_id}/${r.id}`, { id: r.id });
  await s.setJSON(`indexes/by-status/${r.status}/${r.id}`, { id: r.id });
}

export async function getReservation(id: string): Promise<Reservation | null> {
  const s = store();
  return (await s.get(`reservations/${id}.json`, { type: 'json' })) as Reservation | null;
}

export async function updateReservation(r: Reservation, previousStatus?: string): Promise<void> {
  const s = store();
  await s.setJSON(`reservations/${r.id}.json`, r);
  if (previousStatus && previousStatus !== r.status) {
    await s.delete(`indexes/by-status/${previousStatus}/${r.id}`);
    await s.setJSON(`indexes/by-status/${r.status}/${r.id}`, { id: r.id });
  }
}

export async function listReservationsByStatus(status: string): Promise<Reservation[]> {
  const s = store();
  const { blobs } = await s.list({ prefix: `indexes/by-status/${status}/` });
  const results: Reservation[] = [];
  for (const blob of blobs) {
    const id = blob.key.split('/').pop();
    if (!id) continue;
    const r = (await s.get(`reservations/${id}.json`, { type: 'json' })) as Reservation | null;
    if (r) results.push(r);
  }
  return results.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function listAllReservations(): Promise<Reservation[]> {
  const s = store();
  const { blobs } = await s.list({ prefix: 'reservations/' });
  const results: Reservation[] = [];
  for (const blob of blobs) {
    const r = (await s.get(blob.key, { type: 'json' })) as Reservation | null;
    if (r) results.push(r);
  }
  return results.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export interface ProductCounter {
  product_id: string;
  qty_desejada: number;
  qty_reservada: number;
  last_updated: string;
}

export async function getProductCounter(product_id: string, qty_desejada: number): Promise<ProductCounter> {
  const s = store();
  const existing = (await s.get(`counters/products/${product_id}.json`, { type: 'json' })) as ProductCounter | null;
  if (existing) return existing;
  return { product_id, qty_desejada, qty_reservada: 0, last_updated: new Date().toISOString() };
}

export async function updateProductCounter(product_id: string, qty_desejada: number, delta: number): Promise<ProductCounter> {
  const s = store();
  const current = await getProductCounter(product_id, qty_desejada);
  const next: ProductCounter = {
    ...current,
    qty_desejada,
    qty_reservada: Math.max(0, current.qty_reservada + delta),
    last_updated: new Date().toISOString(),
  };
  await s.setJSON(`counters/products/${product_id}.json`, next);
  return next;
}

export interface RateLimitData { count: number; reset: number; }

export async function checkRateLimit(
  key: string,
  ip: string,
  max: number,
  windowSec: number
): Promise<{ ok: boolean; retryAfter?: number }> {
  const s = store();
  const blob = `ratelimit/${key}/${ip}`;
  const now = Date.now();
  const data = ((await s.get(blob, { type: 'json' })) as RateLimitData | null) || { count: 0, reset: 0 };
  if (now > data.reset) {
    data.count = 0;
    data.reset = now + windowSec * 1000;
  }
  if (data.count >= max) {
    return { ok: false, retryAfter: Math.ceil((data.reset - now) / 1000) };
  }
  data.count++;
  await s.setJSON(blob, data);
  return { ok: true };
}

export async function getAllCounters(): Promise<Record<string, ProductAvailability>> {
  const s = store();
  const { blobs } = await s.list({ prefix: 'counters/products/' });
  const out: Record<string, ProductAvailability> = {};
  for (const blob of blobs) {
    const c = (await s.get(blob.key, { type: 'json' })) as ProductCounter | null;
    if (!c) continue;
    out[c.product_id] = {
      qty_desejada: c.qty_desejada,
      qty_reservada: c.qty_reservada,
      available: Math.max(0, c.qty_desejada - c.qty_reservada),
    };
  }
  return out;
}

/**
 * Total agregado de reservas confirmadas vs total desejado entre TODOS os
 * produtos do catálogo passado em {@link expected}. Usado pra detectar
 * quando a lista chegou em 100% e disparar o agradecimento.
 */
export async function computeTotalProgress(
  expected: Array<{ id: string; qty_desejada: number }>,
): Promise<{ total_reservada: number; total_desejada: number; complete: boolean }> {
  let total_reservada = 0;
  let total_desejada = 0;
  for (const p of expected) {
    const c = await getProductCounter(p.id, p.qty_desejada);
    total_reservada += c.qty_reservada;
    total_desejada += p.qty_desejada;
  }
  return {
    total_reservada,
    total_desejada,
    complete: total_desejada > 0 && total_reservada >= total_desejada,
  };
}
