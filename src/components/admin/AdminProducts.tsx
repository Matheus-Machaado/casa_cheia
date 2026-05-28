import { createSignal, createMemo, createEffect, For, Show, onMount } from 'solid-js';
import type { Product, Room } from '~/types/shared';
import { ROOMS, ROOM_LABELS } from '~/types/shared';
import { authFetch, isLoggedIn } from '~/lib/auth';
import { formatBRL } from '~/lib/format';
import { applyBRLMask, formatCentsAsBRL, parseBRLToCents, PRICE_BRL_INPUT_MAX_LENGTH } from '~/lib/masks';
import { confirmDialog, toast } from './DialogHost';
import {
  draftProducts,
  loadPristineProducts,
  updateProductPatch,
  addNewProduct,
  deleteProduct as draftDeleteProduct,
  markProductForReset,
  getPristineProducts,
} from './draftStore';

interface NewProductDraft {
  title: string;
  price_brl_cents: number | null;
  amazon_url: string;
  image_url: string;
  description: string;
  room: Room;
  qty_desejada: number;
}

const EMPTY_DRAFT: NewProductDraft = {
  title: '',
  price_brl_cents: null,
  amazon_url: '',
  image_url: '',
  description: '',
  room: 'cozinha',
  qty_desejada: 1,
};

async function uploadImage(file: File): Promise<string | null> {
  if (file.size > 5 * 1024 * 1024) {
    toast('Imagem muito grande (máx 5MB)', 'err');
    return null;
  }
  if (!file.type.startsWith('image/')) {
    toast('Arquivo precisa ser uma imagem', 'err');
    return null;
  }
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await authFetch('/api/admin/upload', {
      method: 'POST',
      body: fd,
    });
    const body = await res.json() as { data?: { url: string }; error?: { message: string } };
    if (!res.ok || !body.data) {
      toast(body.error?.message ?? 'Erro no upload', 'err');
      return null;
    }
    return body.data.url;
  } catch (e) {
    const msg = (e as Error).message;
    if (msg !== 'session-expired') toast(msg, 'err');
    return null;
  }
}

interface ImageEditorProps {
  url: string;
  alt: string;
  onChange: (url: string) => void;
  size?: 'sm' | 'lg';
}

function ImageEditor(props: ImageEditorProps) {
  const [uploading, setUploading] = createSignal(false);
  let fileInput: HTMLInputElement | undefined;

  async function handleFile(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadImage(file);
    setUploading(false);
    if (url) {
      props.onChange(url);
      toast('Imagem trocada (lembre-se de publicar)', 'ok', 2000);
    }
    if (fileInput) fileInput.value = '';
  }

  const dim = () => (props.size === 'lg' ? 'w-24 h-24' : 'w-16 h-16');

  return (
    <div class={`${dim()} relative rounded-xl bg-line-2 grid place-items-center overflow-hidden shrink-0 group cursor-pointer`} onClick={() => fileInput?.click()} title="Clique pra trocar a imagem">
      <Show when={props.url} fallback={
        <div class="text-[10px] text-ink-3 text-center px-1">sem imagem</div>
      }>
        <img src={props.url} alt={props.alt} class="max-w-full max-h-full object-contain p-1.5" onError={(e) => (e.currentTarget.style.display = 'none')} />
      </Show>
      <div class="absolute inset-0 bg-ink/70 grid place-items-center opacity-0 group-hover:opacity-100 transition-opacity">
        <Show when={!uploading()} fallback={
          <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        }>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </Show>
      </div>
      <input
        ref={(el) => (fileInput = el)}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        onChange={handleFile}
        class="hidden"
      />
    </div>
  );
}

interface QtyStepperProps {
  value: number;
  min?: number;
  max?: number;
  onCommit: (value: number) => void;
  disabled?: boolean;
}

function QtyStepper(props: QtyStepperProps) {
  const min = () => props.min ?? 0;
  const max = () => props.max ?? 1000;
  const [text, setText] = createSignal(String(props.value));

  createEffect(() => {
    setText(String(props.value));
  });

  function clamp(n: number): number {
    if (!isFinite(n)) return min();
    return Math.max(min(), Math.min(max(), Math.round(n)));
  }

  function commit(n: number) {
    const v = clamp(n);
    if (v !== props.value) props.onCommit(v);
    setText(String(v));
  }

  function dec() { commit(props.value - 1); }
  function inc() { commit(props.value + 1); }

  function onInput(e: InputEvent & { currentTarget: HTMLInputElement }) {
    const cleaned = e.currentTarget.value.replace(/\D/g, '').slice(0, 4);
    setText(cleaned);
    e.currentTarget.value = cleaned;
  }

  function onBlur() {
    const parsed = parseInt(text(), 10);
    commit(isFinite(parsed) ? parsed : min());
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
    if (e.key === 'ArrowUp') { e.preventDefault(); inc(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); dec(); }
  }

  return (
    <div class="flex items-center bg-line-2 rounded-lg overflow-hidden h-9 focus-within:ring-2 focus-within:ring-primary">
      <button
        type="button"
        onClick={dec}
        disabled={props.disabled || props.value <= min()}
        class="h-9 w-9 grid place-items-center text-ink-soft hover:text-ink hover:bg-line transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Diminuir"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
      <input
        type="text"
        inputMode="numeric"
        maxLength={4}
        value={text()}
        onInput={onInput}
        onBlur={onBlur}
        onKeyDown={onKey}
        onFocus={(e) => e.currentTarget.select()}
        disabled={props.disabled}
        class="flex-1 h-9 px-1 bg-transparent border-0 text-sm font-semibold text-ink text-center focus:outline-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={inc}
        disabled={props.disabled || props.value >= max()}
        class="h-9 w-9 grid place-items-center text-ink-soft hover:text-ink hover:bg-line transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        aria-label="Aumentar"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
      </button>
    </div>
  );
}

interface PriceInputProps {
  cents: number | null;
  placeholder?: string;
  onCommit: (cents: number | null) => void;
  class?: string;
  disabled?: boolean;
}

function PriceInput(props: PriceInputProps) {
  const [text, setText] = createSignal(props.cents === null ? '' : formatCentsAsBRL(props.cents));

  createEffect(() => {
    const next = props.cents === null ? '' : formatCentsAsBRL(props.cents);
    setText(next);
  });

  function onInput(e: InputEvent & { currentTarget: HTMLInputElement }) {
    const masked = applyBRLMask(e.currentTarget.value);
    setText(masked);
  }

  function onBlur() {
    const cents = parseBRLToCents(text());
    if (cents !== props.cents) props.onCommit(cents);
  }

  return (
    <div class="relative">
      <span class="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-3 font-semibold pointer-events-none">R$</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={PRICE_BRL_INPUT_MAX_LENGTH}
        value={text()}
        placeholder={props.placeholder ?? 'a combinar'}
        onInput={onInput}
        onBlur={onBlur}
        disabled={props.disabled}
        class={props.class ?? 'w-full h-9 pl-8 pr-3 bg-line-2 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition'}
      />
    </div>
  );
}

export default function AdminProducts() {
  const [search, setSearch] = createSignal('');
  const [filter, setFilter] = createSignal<'all' | Room>('all');
  const [showInactive, setShowInactive] = createSignal(false);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [showCreate, setShowCreate] = createSignal(false);
  const [draft, setDraft] = createSignal<NewProductDraft>({ ...EMPTY_DRAFT });

  async function load() {
    if (!isLoggedIn()) { setLoading(false); return; }
    if (getPristineProducts().length > 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/products');
      const body = await res.json() as { data?: Product[]; error?: { message: string } };
      if (!res.ok || !body.data) {
        setError(body.error?.message ?? 'Erro ao carregar produtos');
        return;
      }
      loadPristineProducts(body.data.sort((a, b) => a.order - b.order));
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== 'session-expired') setError(msg);
    } finally {
      setLoading(false);
    }
  }

  onMount(load);

  const filtered = createMemo(() => {
    let list = draftProducts();
    if (!showInactive()) list = list.filter((p) => p.active);
    if (filter() !== 'all') list = list.filter((p) => p.room === filter());
    const q = search().toLowerCase().trim();
    if (q) list = list.filter((p) => p.title.toLowerCase().includes(q) || p.id.toLowerCase().includes(q));
    return list;
  });

  function patchProduct(id: string, patch: Partial<Product>) {
    updateProductPatch(id, patch);
  }

  async function resetProduct(id: string, title: string) {
    const ok = await confirmDialog({
      title: 'Resetar alterações?',
      body: `Volta o "${title}" pros valores originais (preço, título, etc) quando você publicar. Reservas existentes não são afetadas.`,
      ok: 'Resetar',
      cancel: 'Voltar',
    });
    if (!ok) return;
    markProductForReset(id);
    toast('Vai resetar quando publicar', 'ok', 1800);
  }

  async function removeProduct(id: string, title: string) {
    const ok = await confirmDialog({
      title: 'Excluir produto?',
      body: `"${title}" some da lista pra todo mundo quando você publicar. Reservas existentes desse produto continuam no histórico mas ficam sem item associado. Se quer só esconder, desative em vez de excluir.`,
      ok: 'Excluir',
      cancel: 'Voltar',
      danger: true,
    });
    if (!ok) return;
    draftDeleteProduct(id);
    toast('Vai excluir quando publicar', 'ok', 1800);
  }

  function updateDraft<K extends keyof NewProductDraft>(key: K, value: NewProductDraft[K]) {
    setDraft({ ...draft(), [key]: value });
  }

  function submitCreate() {
    const d = draft();
    if (!d.title.trim() || !d.amazon_url.trim() || !d.image_url.trim()) {
      toast('Preencha título, URL Amazon e imagem', 'warn');
      return;
    }
    // ID temporário com prefixo 'pending-' (só pra rastreio local).
    const tempId = 'pending-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const next: Product = {
      id: tempId,
      title: d.title.trim(),
      price_brl_cents: d.price_brl_cents,
      amazon_dp: '',
      amazon_url: d.amazon_url.trim(),
      image_url: d.image_url.trim(),
      description: d.description.trim(),
      room: d.room,
      qty_desejada: d.qty_desejada,
      order: 999,
      active: true,
    };
    addNewProduct(next);
    setDraft({ ...EMPTY_DRAFT });
    setShowCreate(false);
    toast('Adicionado ao rascunho — publique pra subir', 'ok', 2200);
  }

  return (
    <div class="max-w-6xl mx-auto px-5 lg:px-8 py-5 lg:py-7 space-y-5">
      <div class="bg-white border border-line rounded-2xl p-5 lg:p-6 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <h2 class="text-lg font-bold text-ink tracking-tight">Produtos do catálogo</h2>
          <p class="text-sm text-ink-soft mt-1">Edite preço, título, link Amazon, quantidade e status. Mudanças ficam no rascunho até você clicar em <strong>Publicar</strong> no topo.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          class="shrink-0 h-10 px-4 rounded-xl bg-primary hover:bg-primary-h text-white text-sm font-semibold transition cursor-pointer flex items-center justify-center gap-1.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar produto
        </button>
      </div>

      <div class="bg-white border border-line rounded-2xl p-3 lg:p-4 flex flex-col lg:flex-row gap-3">
        <div class="flex-1 relative">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Buscar por título ou id..."
            value={search()}
            onInput={(e) => setSearch(e.currentTarget.value)}
            class="w-full h-10 pl-9 pr-3 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
          />
        </div>
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button type="button" onClick={() => setFilter('all')} class={`shrink-0 px-3 h-9 rounded-full border text-xs font-semibold transition cursor-pointer ${filter() === 'all' ? 'bg-ink border-ink text-white' : 'bg-white border-line text-ink-soft hover:bg-line-2'}`}>Todos</button>
          <For each={ROOMS}>
            {(r) => (
              <button type="button" onClick={() => setFilter(r)} class={`shrink-0 px-3 h-9 rounded-full border text-xs font-semibold transition cursor-pointer ${filter() === r ? 'bg-ink border-ink text-white' : 'bg-white border-line text-ink-soft hover:bg-line-2'}`}>{ROOM_LABELS[r]}</button>
            )}
          </For>
        </div>
        <label class="flex items-center gap-2 text-xs text-ink-soft cursor-pointer shrink-0">
          <input
            type="checkbox"
            checked={showInactive()}
            onChange={(e) => setShowInactive(e.currentTarget.checked)}
            class="w-4 h-4 accent-primary cursor-pointer"
          />
          Mostrar inativos
        </label>
      </div>

      <Show when={error()}>
        <div class="bg-danger-s text-danger text-sm rounded-lg px-4 py-3">{error()}</div>
      </Show>

      <Show when={loading()}>
        <div class="text-center py-10 text-ink-3 text-sm">Carregando…</div>
      </Show>

      <Show when={!loading() && filtered().length === 0}>
        <div class="text-center py-12 text-ink-3">
          <p class="text-sm">Nenhum produto encontrado.</p>
        </div>
      </Show>

      <div class="space-y-2">
        <For each={filtered()}>
          {(p) => (
            <div class={`bg-white border border-line rounded-2xl p-4 ${!p.active ? 'opacity-60' : ''} transition`}>
              <div class="flex flex-col lg:flex-row gap-4">
                <div class="flex items-start gap-3 flex-1 min-w-0">
                  <ImageEditor
                    url={p.image_url}
                    alt={p.title}
                    onChange={(url) => patchProduct(p.id, { image_url: url })}
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-[10px] uppercase tracking-wider text-ink-3 font-bold">{ROOM_LABELS[p.room]}</span>
                      <span class="text-[10px] text-ink-3">·</span>
                      <span class="text-[10px] text-ink-3 font-mono truncate">{p.id}</span>
                    </div>
                    <input
                      type="text"
                      value={p.title}
                      maxLength={200}
                      onInput={(e) => patchProduct(p.id, { title: e.currentTarget.value })}
                      class="w-full text-sm font-semibold text-ink bg-transparent border-0 border-b border-transparent hover:border-line focus:border-primary focus:outline-none transition py-1"
                    />
                    <input
                      type="url"
                      maxLength={500}
                      value={p.amazon_url}
                      placeholder="https://www.amazon.com.br/dp/..."
                      onInput={(e) => patchProduct(p.id, { amazon_url: e.currentTarget.value })}
                      class="w-full text-[11px] text-ink-3 bg-transparent border-0 border-b border-transparent hover:border-line focus:border-primary focus:outline-none transition py-0.5 mt-0.5 font-mono truncate"
                    />
                  </div>
                </div>

                <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 lg:items-end">
                  <div>
                    <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">Preço</label>
                    <PriceInput
                      cents={p.price_brl_cents}
                      onCommit={(cents) => patchProduct(p.id, { price_brl_cents: cents })}
                    />
                  </div>
                  <div>
                    <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">Qtd desejada</label>
                    <QtyStepper
                      value={p.qty_desejada}
                      min={0}
                      max={1000}
                      onCommit={(v) => patchProduct(p.id, { qty_desejada: v })}
                    />
                  </div>
                  <div class="col-span-2 lg:col-span-1 flex items-center justify-between gap-2 lg:justify-end">
                    <label class="flex items-center gap-2 cursor-pointer">
                      <span class="text-[10px] uppercase tracking-wider text-ink-3 font-bold">Ativo</span>
                      <button
                        type="button"
                        onClick={() => patchProduct(p.id, { active: !p.active })}
                        class={`h-6 w-11 rounded-full transition relative cursor-pointer ${p.active ? 'bg-primary' : 'bg-line'}`}
                        aria-label="Toggle ativo"
                      >
                        <span class={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition shadow-sm ${p.active ? 'translate-x-5' : ''}`} />
                      </button>
                    </label>
                  </div>
                </div>
              </div>

              <div class="mt-3">
                <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">Descrição</label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={p.description}
                  onInput={(e) => patchProduct(p.id, { description: e.currentTarget.value })}
                  class="w-full px-3 py-2 bg-line-2 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition resize-none"
                />
                <div class="mt-2 flex items-center justify-between flex-wrap gap-2">
                  <Show when={p.price_brl_cents !== null}>
                    <div class="text-[11px] text-ink-3">Preço atual exibido: <strong class="text-ink-soft">{formatBRL(p.price_brl_cents)}</strong></div>
                  </Show>
                  <div class="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={() => resetProduct(p.id, p.title)}
                      title="Volta pros valores originais"
                      class="h-8 px-2.5 rounded-lg text-xs font-semibold text-ink-3 hover:text-ink hover:bg-line-2 transition cursor-pointer flex items-center gap-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                      Resetar
                    </button>
                    <button
                      type="button"
                      onClick={() => removeProduct(p.id, p.title)}
                      title="Remove ao publicar"
                      class="h-8 px-2.5 rounded-lg text-xs font-semibold text-ink-soft hover:text-danger hover:bg-danger-s transition cursor-pointer flex items-center gap-1"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                      Excluir
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </For>
      </div>

      <Show when={showCreate()}>
        <div class="fixed inset-0 z-50 grid place-items-end lg:place-items-center p-0 lg:p-4" style="background: rgba(9,9,11,0.55); backdrop-filter: blur(2px);" role="dialog" aria-modal="true">
          <div class="bg-white w-full lg:max-w-2xl rounded-t-2xl lg:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-line px-5 lg:px-6 h-14 flex items-center justify-between">
              <h3 class="text-lg font-bold text-ink tracking-tight">Novo produto</h3>
              <button type="button" onClick={() => setShowCreate(false)} class="w-9 h-9 -mr-2 grid place-items-center text-ink-3 hover:text-ink rounded-lg hover:bg-line-2 transition cursor-pointer" aria-label="Fechar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="p-5 lg:p-6 space-y-4">
              <div>
                <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Título</label>
                <input type="text" value={draft().title} maxLength={200} onInput={(e) => updateDraft('title', e.currentTarget.value)} placeholder="Ex: Kit 4 Taças Cristal" class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition" />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Preço</label>
                  <PriceInput
                    cents={draft().price_brl_cents}
                    onCommit={(cents) => updateDraft('price_brl_cents', cents)}
                    class="w-full h-11 pl-8 pr-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                  />
                </div>
                <div>
                  <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Qtd desejada</label>
                  <QtyStepper
                    value={draft().qty_desejada}
                    min={1}
                    max={1000}
                    onCommit={(v) => updateDraft('qty_desejada', v)}
                  />
                </div>
              </div>

              <div>
                <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Cômodo</label>
                <select value={draft().room} onChange={(e) => updateDraft('room', e.currentTarget.value as Room)} class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition cursor-pointer">
                  <For each={ROOMS}>
                    {(r) => <option value={r}>{ROOM_LABELS[r]}</option>}
                  </For>
                </select>
              </div>

              <div>
                <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">URL da Amazon</label>
                <input type="url" maxLength={500} value={draft().amazon_url} onInput={(e) => updateDraft('amazon_url', e.currentTarget.value)} placeholder="https://www.amazon.com.br/dp/..." class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition font-mono" />
              </div>

              <div>
                <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Imagem</label>
                <div class="flex items-start gap-3">
                  <ImageEditor
                    url={draft().image_url}
                    alt="Pré-visualização"
                    onChange={(url) => updateDraft('image_url', url)}
                    size="lg"
                  />
                  <div class="flex-1 min-w-0">
                    <input type="url" maxLength={500} value={draft().image_url} onInput={(e) => updateDraft('image_url', e.currentTarget.value)} placeholder="https://m.media-amazon.com/... ou faça upload no quadrinho" class="w-full h-10 px-3 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition font-mono" />
                    <p class="text-[11px] text-ink-3 mt-1.5">Clique no quadrinho à esquerda pra fazer upload de uma foto sua, ou cole a URL da imagem da Amazon.</p>
                  </div>
                </div>
              </div>

              <div>
                <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Descrição</label>
                <textarea rows={3} maxLength={500} value={draft().description} onInput={(e) => updateDraft('description', e.currentTarget.value)} placeholder="Detalhe curto que aparece pro convidado." class="w-full px-3.5 py-2.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition resize-none" />
              </div>
            </div>

            <div class="sticky bottom-0 bg-line-2 border-t border-line p-3 lg:p-4 flex items-center gap-2 justify-end">
              <button type="button" onClick={() => setShowCreate(false)} class="h-10 px-4 rounded-xl bg-white hover:bg-line text-sm font-semibold text-ink-soft transition cursor-pointer">Cancelar</button>
              <button type="button" onClick={submitCreate} class="h-10 px-5 rounded-xl bg-primary hover:bg-primary-h text-white text-sm font-semibold transition cursor-pointer">
                Adicionar ao rascunho
              </button>
            </div>
          </div>
        </div>
      </Show>
    </div>
  );
}
