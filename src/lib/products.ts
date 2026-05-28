import { getStore } from '@netlify/blobs';
import type { Product, Room } from '~/types/shared';
import productsData from '~/data/products.json';

export interface ProductOverride {
  title?: string;
  price_brl_cents?: number | null;
  amazon_dp?: string;
  amazon_url?: string;
  image_url?: string;
  description?: string;
  room?: Room;
  qty_desejada?: number;
  order?: number;
  active?: boolean;
}

/**
 * Estrutura única salva no Blobs:
 *  - overrides: edits sobre produtos do JSON estático
 *  - added:    produtos criados pela Lina (não estão no JSON)
 *  - deleted:  ids de produtos do JSON que a Lina excluiu (some do site)
 */
interface ProductsState {
  overrides: Record<string, ProductOverride>;
  added: Product[];
  deleted: string[];
}

const STORE_NAME = 'settings';
const STATE_KEY = 'products-overrides.json';

function emptyState(): ProductsState {
  return { overrides: {}, added: [], deleted: [] };
}

function store() {
  return getStore({ name: STORE_NAME, consistency: 'strong' });
}

async function readState(): Promise<ProductsState> {
  try {
    const data = (await store().get(STATE_KEY, { type: 'json' })) as unknown;
    if (!data || typeof data !== 'object') return emptyState();
    const d = data as Partial<ProductsState> & Record<string, unknown>;
    // Migração backward-compat: formato antigo era só `Record<string, ProductOverride>`.
    if (!d.overrides && !d.added && !d.deleted) {
      return { overrides: data as Record<string, ProductOverride>, added: [], deleted: [] };
    }
    return {
      overrides: d.overrides ?? {},
      added: Array.isArray(d.added) ? d.added : [],
      deleted: Array.isArray(d.deleted) ? d.deleted : [],
    };
  } catch {
    return emptyState();
  }
}

async function writeState(next: ProductsState): Promise<void> {
  await store().setJSON(STATE_KEY, next);
}

function applyOverride(p: Product, ov?: ProductOverride): Product {
  if (!ov) return p;
  return {
    ...p,
    title: ov.title ?? p.title,
    price_brl_cents: ov.price_brl_cents !== undefined ? ov.price_brl_cents : p.price_brl_cents,
    amazon_dp: ov.amazon_dp ?? p.amazon_dp,
    amazon_url: ov.amazon_url ?? p.amazon_url,
    image_url: ov.image_url ?? p.image_url,
    description: ov.description ?? p.description,
    room: ov.room ?? p.room,
    qty_desejada: ov.qty_desejada ?? p.qty_desejada,
    order: ov.order ?? p.order,
    active: ov.active ?? p.active,
  };
}

/**
 * Síncrono. Lê só JSON estático (sem overrides). Útil em build-time
 * de páginas pré-renderizadas.
 */
export function getAllProducts(): Product[] {
  return (productsData as Product[]).filter((p) => p.active).sort((a, b) => a.order - b.order);
}

export function getProductById(id: string): Product | undefined {
  return (productsData as Product[]).find((p) => p.id === id);
}

export function getProductsByRoom(room: Room): Product[] {
  return getAllProducts().filter((p) => p.room === room);
}

/**
 * Async. Mescla JSON com adições/overrides/exclusões do Blobs.
 * Pra páginas SSR e handlers de API.
 */
export async function getRuntimeProducts(): Promise<Product[]> {
  const state = await readState();
  const fromJson = (productsData as Product[])
    .filter((p) => !state.deleted.includes(p.id))
    .map((p) => applyOverride(p, state.overrides[p.id]));
  return [...fromJson, ...state.added]
    .filter((p) => p.active)
    .sort((a, b) => a.order - b.order);
}

export async function getRuntimeProductById(id: string): Promise<Product | undefined> {
  const state = await readState();
  if (state.deleted.includes(id)) return undefined;
  const added = state.added.find((p) => p.id === id);
  if (added) return added;
  const base = (productsData as Product[]).find((x) => x.id === id);
  return base ? applyOverride(base, state.overrides[id]) : undefined;
}

/**
 * Pro admin: inclui inativos. Não inclui excluídos.
 */
export async function listAllRuntimeProducts(): Promise<Product[]> {
  const state = await readState();
  const fromJson = (productsData as Product[])
    .filter((p) => !state.deleted.includes(p.id))
    .map((p) => applyOverride(p, state.overrides[p.id]));
  return [...fromJson, ...state.added];
}

function isJsonProduct(id: string): boolean {
  return (productsData as Product[]).some((p) => p.id === id);
}

export async function updateProductOverride(id: string, patch: ProductOverride): Promise<Product> {
  const state = await readState();
  // Produto adicionado pela Lina: muda direto no `added`.
  const addedIdx = state.added.findIndex((p) => p.id === id);
  if (addedIdx >= 0) {
    state.added[addedIdx] = applyOverride(state.added[addedIdx], patch);
    await writeState(state);
    return state.added[addedIdx];
  }
  // Produto do JSON: salva em overrides.
  const base = (productsData as Product[]).find((p) => p.id === id);
  if (!base) throw new Error('product-not-found');
  state.overrides[id] = { ...(state.overrides[id] ?? {}), ...patch };
  await writeState(state);
  return applyOverride(base, state.overrides[id]);
}

export async function resetProductOverride(id: string): Promise<Product> {
  const state = await readState();
  const base = (productsData as Product[]).find((p) => p.id === id);
  if (!base) throw new Error('product-not-found');
  delete state.overrides[id];
  await writeState(state);
  return base;
}

export interface AddProductInput {
  id?: string;
  title: string;
  price_brl_cents: number | null;
  amazon_dp?: string;
  amazon_url: string;
  image_url: string;
  description?: string;
  room: Room;
  qty_desejada: number;
  order?: number;
  active?: boolean;
}

export async function addProduct(input: AddProductInput): Promise<Product> {
  const state = await readState();
  // Garante ID único: se vier vazio ou colidir, gera novo.
  const existingIds = new Set([
    ...(productsData as Product[]).map((p) => p.id),
    ...state.added.map((p) => p.id),
  ]);
  let id = input.id?.trim();
  if (!id || existingIds.has(id)) {
    id = 'custom-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }
  const next: Product = {
    id,
    title: input.title.trim(),
    price_brl_cents: input.price_brl_cents,
    amazon_dp: input.amazon_dp ?? '',
    amazon_url: input.amazon_url.trim(),
    image_url: input.image_url.trim(),
    description: input.description?.trim() ?? '',
    room: input.room,
    qty_desejada: input.qty_desejada,
    order: input.order ?? 999,
    active: input.active ?? true,
  };
  state.added.push(next);
  await writeState(state);
  return next;
}

/**
 * Exclui um produto da lista. Se for adicionado pela Lina, remove do
 * Blobs (some sem rastro). Se for do JSON estático, marca em
 * `deleted` (some do site e do painel; reservations antigas
 * continuam referenciando o id mas como "produto não encontrado").
 */
export async function deleteProduct(id: string): Promise<void> {
  const state = await readState();
  if (isJsonProduct(id)) {
    if (!state.deleted.includes(id)) state.deleted.push(id);
    delete state.overrides[id];
  } else {
    state.added = state.added.filter((p) => p.id !== id);
  }
  await writeState(state);
}
