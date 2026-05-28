/**
 * Store global de rascunho do painel admin. Mesma ideia do
 * diamantina-trekking: estado "pristine" (último publicado) + "draft"
 * (em edição). Componentes leem e escrevem aqui via signals; nada vai
 * pro backend até a Lina clicar em Publicar.
 */
import { createSignal, createMemo } from 'solid-js';
import type { Product, Settings } from '~/types/shared';
import { authFetch } from '~/lib/auth';

// ────────────────────────────────────────────────────────────────────
// Settings
// ────────────────────────────────────────────────────────────────────

const [pristineSettings, setPristineSettings] = createSignal<Settings | null>(null);
const [settingsPatch, setSettingsPatch] = createSignal<Partial<Settings>>({});

export function getPristineSettings(): Settings | null {
  return pristineSettings();
}

/**
 * Settings mesclado: pristine + patch local. Use isso pra renderizar
 * inputs e previews. Reativo.
 */
export const draftSettings = createMemo<Settings | null>(() => {
  const p = pristineSettings();
  if (!p) return null;
  return { ...p, ...settingsPatch() };
});

export function loadPristineSettings(s: Settings): void {
  setPristineSettings(s);
  setSettingsPatch({});
}

export function updateSettingsPatch<K extends keyof Settings>(key: K, value: Settings[K]): void {
  const pristine = pristineSettings();
  const patch = { ...settingsPatch() };
  // Se valor voltou pro original, remove do patch.
  if (pristine && JSON.stringify(pristine[key]) === JSON.stringify(value)) {
    delete patch[key];
  } else {
    patch[key] = value;
  }
  setSettingsPatch(patch);
}

export function patchSettingsBulk(partial: Partial<Settings>): void {
  const pristine = pristineSettings();
  const patch = { ...settingsPatch() };
  for (const [k, v] of Object.entries(partial) as Array<[keyof Settings, Settings[keyof Settings]]>) {
    if (pristine && JSON.stringify(pristine[k]) === JSON.stringify(v)) {
      delete patch[k];
    } else {
      (patch as Record<string, unknown>)[k as string] = v;
    }
  }
  setSettingsPatch(patch);
}

// ────────────────────────────────────────────────────────────────────
// Products
// ────────────────────────────────────────────────────────────────────

const [pristineProducts, setPristineProducts] = createSignal<Product[]>([]);
const [productPatches, setProductPatches] = createSignal<Record<string, Partial<Product>>>({});
const [newProducts, setNewProducts] = createSignal<Product[]>([]); // adições pendentes (não no backend ainda)
const [deletedProductIds, setDeletedProductIds] = createSignal<Set<string>>(new Set());
const [resetProductIds, setResetProductIds] = createSignal<Set<string>>(new Set());

export function loadPristineProducts(list: Product[]): void {
  setPristineProducts(list);
  setProductPatches({});
  setNewProducts([]);
  setDeletedProductIds(new Set<string>());
  setResetProductIds(new Set<string>());
}

export function getPristineProducts(): Product[] {
  return pristineProducts();
}

/**
 * Lista combinada: pristine + adições novas - exclusões + patches
 * aplicados em cima.
 */
export const draftProducts = createMemo<Product[]>(() => {
  const pristine = pristineProducts();
  const patches = productPatches();
  const adds = newProducts();
  const dels = deletedProductIds();
  const merged = pristine
    .filter((p) => !dels.has(p.id))
    .map((p) => ({ ...p, ...(patches[p.id] ?? {}) }));
  return [...merged, ...adds].sort((a, b) => a.order - b.order);
});

export function updateProductPatch(id: string, patch: Partial<Product>): void {
  // Se é um produto novo (não está no pristine), aplica direto na lista de novos.
  const newOnes = newProducts();
  const newIdx = newOnes.findIndex((p) => p.id === id);
  if (newIdx >= 0) {
    const next = newOnes.slice();
    next[newIdx] = { ...next[newIdx], ...patch };
    setNewProducts(next);
    return;
  }
  // Senão, registra o patch sobre o pristine.
  const pristine = pristineProducts().find((p) => p.id === id);
  if (!pristine) return;
  const patches = { ...productPatches() };
  const current = patches[id] ?? {};
  const merged: Partial<Product> = { ...current };
  for (const [k, v] of Object.entries(patch) as Array<[keyof Product, Product[keyof Product]]>) {
    if (JSON.stringify(pristine[k]) === JSON.stringify(v)) {
      delete merged[k];
    } else {
      (merged as Record<string, unknown>)[k as string] = v;
    }
  }
  if (Object.keys(merged).length === 0) delete patches[id];
  else patches[id] = merged;
  setProductPatches(patches);
}

export function addNewProduct(product: Product): void {
  setNewProducts([...newProducts(), product]);
}

export function deleteProduct(id: string): void {
  // Se é produto novo (pending), só remove da lista.
  const newOnes = newProducts();
  if (newOnes.some((p) => p.id === id)) {
    setNewProducts(newOnes.filter((p) => p.id !== id));
    return;
  }
  const dels = new Set(deletedProductIds());
  dels.add(id);
  setDeletedProductIds(dels);
  // Limpa qualquer patch local pra esse id.
  const patches = { ...productPatches() };
  delete patches[id];
  setProductPatches(patches);
}

export function undeleteProduct(id: string): void {
  const dels = new Set(deletedProductIds());
  dels.delete(id);
  setDeletedProductIds(dels);
}

export function markProductForReset(id: string): void {
  const set = new Set(resetProductIds());
  set.add(id);
  setResetProductIds(set);
  // Limpa patches locais — vão ser sobrescritos pelo reset no backend.
  const patches = { ...productPatches() };
  delete patches[id];
  setProductPatches(patches);
}

// ────────────────────────────────────────────────────────────────────
// Dirty / contagem
// ────────────────────────────────────────────────────────────────────

export const pendingCount = createMemo(() => {
  const sp = Object.keys(settingsPatch()).length;
  const pp = Object.keys(productPatches()).length;
  const np = newProducts().length;
  const dp = deletedProductIds().size;
  const rp = resetProductIds().size;
  return sp + pp + np + dp + rp;
});

export const hasPendingChanges = createMemo(() => pendingCount() > 0);

export function describePending(): { label: string; count: number }[] {
  const settings = Object.keys(settingsPatch()).length;
  const products = Object.keys(productPatches()).length;
  const news = newProducts().length;
  const deletes = deletedProductIds().size;
  const resets = resetProductIds().size;
  const items: { label: string; count: number }[] = [];
  if (settings) items.push({ label: settings === 1 ? '1 configuração' : `${settings} configurações`, count: settings });
  if (products) items.push({ label: products === 1 ? '1 produto editado' : `${products} produtos editados`, count: products });
  if (news) items.push({ label: news === 1 ? '1 produto novo' : `${news} produtos novos`, count: news });
  if (deletes) items.push({ label: deletes === 1 ? '1 produto excluído' : `${deletes} produtos excluídos`, count: deletes });
  if (resets) items.push({ label: resets === 1 ? '1 produto resetado' : `${resets} produtos resetados`, count: resets });
  return items;
}

// ────────────────────────────────────────────────────────────────────
// Publish / Discard
// ────────────────────────────────────────────────────────────────────

export interface PublishResult {
  ok: boolean;
  errors: string[];
  publishedSettings: Settings | null;
  publishedProducts: Product[];
}

/**
 * Aplica tudo no backend em sequência. Para garantir consistência da
 * UI, recarrega settings+products após cada bloco de mudanças.
 */
export async function publishAll(): Promise<PublishResult> {
  const errors: string[] = [];
  let publishedSettings: Settings | null = null;
  let publishedProducts: Product[] = [];

  // 1. Settings
  const sp = settingsPatch();
  if (Object.keys(sp).length > 0) {
    try {
      const res = await authFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sp),
      });
      const body = await res.json() as { data?: Settings; error?: { message: string } };
      if (!res.ok || !body.data) {
        errors.push('Configurações: ' + (body.error?.message ?? 'falha'));
      } else {
        publishedSettings = body.data;
      }
    } catch (e) {
      errors.push('Configurações: ' + (e as Error).message);
    }
  }

  // 2. Resets de produtos (antes dos patches, pra não conflitar)
  for (const id of resetProductIds()) {
    try {
      const res = await authFetch('/api/admin/products?action=reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: { message: string } };
        errors.push(`Reset ${id}: ` + (body.error?.message ?? 'falha'));
      }
    } catch (e) {
      errors.push(`Reset ${id}: ` + (e as Error).message);
    }
  }

  // 3. Exclusões
  for (const id of deletedProductIds()) {
    try {
      const res = await authFetch('/api/admin/products?action=delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: { message: string } };
        errors.push(`Excluir ${id}: ` + (body.error?.message ?? 'falha'));
      }
    } catch (e) {
      errors.push(`Excluir ${id}: ` + (e as Error).message);
    }
  }

  // 4. Patches em produtos existentes
  const patches = productPatches();
  for (const id of Object.keys(patches)) {
    try {
      const res = await authFetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, patch: patches[id] }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: { message: string } };
        errors.push(`Editar ${id}: ` + (body.error?.message ?? 'falha'));
      }
    } catch (e) {
      errors.push(`Editar ${id}: ` + (e as Error).message);
    }
  }

  // 5. Criação de produtos novos
  for (const newProd of newProducts()) {
    try {
      const res = await authFetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newProd.title,
          price_brl_cents: newProd.price_brl_cents,
          amazon_url: newProd.amazon_url,
          image_url: newProd.image_url,
          description: newProd.description,
          room: newProd.room,
          qty_desejada: newProd.qty_desejada,
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: { message: string } };
        errors.push(`Criar ${newProd.title}: ` + (body.error?.message ?? 'falha'));
      }
    } catch (e) {
      errors.push(`Criar ${newProd.title}: ` + (e as Error).message);
    }
  }

  // 6. Recarrega tudo do backend pra atualizar pristine
  try {
    const [sRes, pRes] = await Promise.all([
      authFetch('/api/admin/settings'),
      authFetch('/api/admin/products'),
    ]);
    const sBody = await sRes.json() as { data?: { settings: Settings } };
    const pBody = await pRes.json() as { data?: Product[] };
    if (sBody.data?.settings) {
      publishedSettings = sBody.data.settings;
      loadPristineSettings(sBody.data.settings);
    }
    if (pBody.data) {
      publishedProducts = pBody.data;
      loadPristineProducts(pBody.data);
    }
  } catch {/* ignore reload error */}

  return { ok: errors.length === 0, errors, publishedSettings, publishedProducts };
}

export function discardAll(): void {
  setSettingsPatch({});
  setProductPatches({});
  setNewProducts([]);
  setDeletedProductIds(new Set<string>());
  setResetProductIds(new Set<string>());
}
