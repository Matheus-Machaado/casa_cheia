import type { APIRoute } from 'astro';
import { json } from '~/lib/api';
import { getAllCounters } from '~/lib/blobs';
import { getAllProducts, getProductsByOverlay } from '~/lib/products';
import type { AvailabilitySnapshot, ProductAvailability } from '~/types/shared';

export const prerender = false;

export const GET: APIRoute = async () => {
  const counters = await getAllCounters();
  const allProducts = getAllProducts();

  const products: Record<string, ProductAvailability> = {};
  let totalConfirmed = 0;
  let totalDesired = 0;

  for (const p of allProducts) {
    const c = counters[p.id] || { qty_desejada: p.qty_desejada, qty_reservada: 0, available: p.qty_desejada };
    products[p.id] = c;
    totalConfirmed += c.qty_reservada;
    totalDesired += p.qty_desejada;
  }

  // Compute overlays_active: overlay aparece se ALGUM produto associado tem qty_reservada > 0
  const overlaysActive = new Set<string>();
  for (const p of allProducts) {
    if (!p.overlay_id) continue;
    const c = products[p.id];
    if (c.qty_reservada > 0) overlaysActive.add(p.overlay_id);
  }

  const snapshot: AvailabilitySnapshot = {
    generated_at: new Date().toISOString(),
    total_progress_pct: totalDesired > 0 ? Math.round((totalConfirmed / totalDesired) * 100) : 0,
    total_confirmed: totalConfirmed,
    total_desired: totalDesired,
    products,
    overlays_active: [...overlaysActive],
  };

  return json({ data: snapshot }, 200, {
    'Cache-Control': 'public, max-age=30, s-maxage=30, stale-while-revalidate=120',
  });
};
