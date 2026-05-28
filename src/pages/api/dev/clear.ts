import type { APIRoute } from 'astro';
import { json } from '~/lib/api';
import { listAllReservations } from '~/lib/blobs';
import { getStore } from '@netlify/blobs';

export const prerender = false;

const DEMO_IP_HASH = 'DEMO_SEED';
const RESERVATIONS_STORE = 'reservations';

/**
 * Limpa todas as reservas seedadas pelo /api/dev/seed (identifica pela
 * tag ip_hash === DEMO_SEED). Gated pelo mesmo SEED_TOKEN.
 */
export const GET: APIRoute = async ({ url }) => {
  const expected = process.env.SEED_TOKEN;
  if (!expected) {
    return new Response('Not found', { status: 404 });
  }
  const provided = url.searchParams.get('token');
  if (provided !== expected) {
    return new Response('Not found', { status: 404 });
  }

  const all = await listAllReservations();
  const demos = all.filter((r) => r.ip_hash === DEMO_IP_HASH);

  const store = getStore({ name: RESERVATIONS_STORE, consistency: 'strong' });
  let deleted = 0;
  const productAdjustments: Record<string, number> = {};

  for (const r of demos) {
    await store.delete(`reservations/${r.id}.json`);
    await store.delete(`indexes/by-product/${r.product_id}/${r.id}`);
    await store.delete(`indexes/by-status/${r.status}/${r.id}`);
    deleted++;
    productAdjustments[r.product_id] = (productAdjustments[r.product_id] ?? 0) + r.qty;
  }

  // Zera os counters dos produtos afetados
  for (const [productId, qty] of Object.entries(productAdjustments)) {
    const counterKey = `counters/products/${productId}.json`;
    const counter = (await store.get(counterKey, { type: 'json' })) as { qty_desejada: number; qty_reservada: number; last_updated: string } | null;
    if (counter) {
      counter.qty_reservada = Math.max(0, counter.qty_reservada - qty);
      counter.last_updated = new Date().toISOString();
      await store.setJSON(counterKey, counter);
    }
  }

  return json({
    data: { ok: true, deleted, productAdjustments },
  }, 200, { 'Cache-Control': 'no-store' });
};
