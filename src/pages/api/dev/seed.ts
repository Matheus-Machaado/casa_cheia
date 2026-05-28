import type { APIRoute } from 'astro';
import { json, errorResponse } from '~/lib/api';
import { getRuntimeProducts } from '~/lib/products';
import { putReservation, updateProductCounter, listAllReservations } from '~/lib/blobs';
import type { Reservation } from '~/types/shared';

export const prerender = false;

const DEMO_IP_HASH = 'DEMO_SEED';

/**
 * Endpoint só pra preview/staging: lota o catálogo deixando 1 produto
 * faltando. Gated por env var SEED_TOKEN — em prod (sem token setado),
 * retorna 404 silencioso pra não vazar existência do endpoint.
 *
 * Uso: GET /api/dev/seed?token=<SEED_TOKEN>
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

  const products = await getRuntimeProducts();
  const active = products.filter((p) => p.active);
  if (active.length === 0) {
    return errorResponse('CONFLICT', 'Nenhum produto ativo no catálogo', 409);
  }

  // Escolhe 1 produto pra deixar vazio (pseudo-aleatório baseado em hash)
  const skipIdx = Math.floor(Math.random() * active.length);
  const skipped = active[skipIdx];

  // Embaralha nomes
  const sampleNames = [
    'Ana Beatriz', 'Bruno Almeida', 'Carla Mendes', 'Diego Ferreira', 'Eduarda Lima',
    'Felipe Souza', 'Gabriela Castro', 'Henrique Dias', 'Isabela Rocha', 'João Pedro',
    'Karina Oliveira', 'Lucas Martins', 'Marina Costa', 'Nathan Pereira', 'Olívia Santos',
    'Paulo Henrique', 'Quezia Barbosa', 'Rafael Gomes', 'Sofia Carvalho', 'Thiago Ribeiro',
    'Ursula Nascimento', 'Vinícius Andrade', 'Wesley Cunha', 'Yara Fernandes', 'Zoe Cardoso',
  ];

  const created: Array<{ id: string; product: string; qty: number; guest: string }> = [];
  let nameIdx = 0;

  for (const p of active) {
    if (p.id === skipped.id) continue;
    // Lota o produto: reserva todas as qty_desejada disponíveis
    const qty = p.qty_desejada;
    const guestName = sampleNames[nameIdx % sampleNames.length];
    nameIdx++;

    const now = new Date(Date.now() - Math.floor(Math.random() * 7 * 24 * 60 * 60 * 1000)).toISOString();
    const reservation: Reservation = {
      _v: 1,
      id: crypto.randomUUID(),
      product_id: p.id,
      guest_name: guestName,
      guest_email: null,
      guest_phone: null,
      qty,
      message: null,
      status: 'confirmada',
      created_at: now,
      cancelled_at: null,
      cancelled_by: null,
      cancellation_reason: null,
      activity_log: [],
      ip_hash: DEMO_IP_HASH,
      user_agent_hash: DEMO_IP_HASH,
    };

    await putReservation(reservation);
    await updateProductCounter(p.id, p.qty_desejada, qty);
    created.push({ id: reservation.id, product: p.title, qty, guest: guestName });
  }

  return json({
    data: {
      ok: true,
      seeded: created.length,
      skipped_product: { id: skipped.id, title: skipped.title },
      total_active_products: active.length,
    },
  }, 200, { 'Cache-Control': 'no-store' });
};
