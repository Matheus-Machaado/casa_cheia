import { createSignal, createMemo, For, onMount, Show } from 'solid-js';
import type { Product, Room, AvailabilitySnapshot } from '~/types/shared';
import { ROOMS, ROOM_LABELS } from '~/types/shared';
import { formatBRL } from '~/lib/format';
import ProductModal from './ProductModal';

interface Props {
  products: Product[];
}

const ROOM_ICONS: Record<string, string> = {
  cozinha: '🍳', eletro: '⚡', quarto: '🛏', banheiro: '🛁',
  lavanderia: '👕', sala: '🛋', limpeza: '✨',
};

export default function Catalog(props: Props) {
  const [filter, setFilter] = createSignal<'all' | Room>('all');
  const [search, setSearch] = createSignal('');
  const [sort, setSort] = createSignal<'order' | 'price-asc' | 'price-desc' | 'title'>('order');
  const [availability, setAvailability] = createSignal<AvailabilitySnapshot | null>(null);
  const [selected, setSelected] = createSignal<Product | null>(null);

  async function loadAvailability() {
    try {
      const res = await fetch('/api/products/availability');
      if (!res.ok) return;
      const body = await res.json() as { data: AvailabilitySnapshot };
      setAvailability(body.data);
    } catch (e) {
      console.warn('availability load failed', e);
    }
  }

  onMount(() => {
    loadAvailability();
    const handler = () => loadAvailability();
    window.addEventListener('casacheia:reservation-created', handler);
    return () => window.removeEventListener('casacheia:reservation-created', handler);
  });

  const filtered = createMemo(() => {
    let list = props.products.slice();
    if (filter() !== 'all') list = list.filter((p) => p.room === filter());
    const q = search().toLowerCase().trim();
    if (q) {
      list = list.filter((p) =>
        p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }
    const s = sort();
    if (s === 'price-asc') list.sort((a, b) => (a.price_brl_cents || 0) - (b.price_brl_cents || 0));
    if (s === 'price-desc') list.sort((a, b) => (b.price_brl_cents || 0) - (a.price_brl_cents || 0));
    if (s === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  });

  const progressInfo = createMemo(() => {
    const av = availability();
    if (!av) {
      return { pct: 0, confirmed: 0, desired: props.products.reduce((a, b) => a + b.qty_desejada, 0) };
    }
    return { pct: av.total_progress_pct, confirmed: av.total_confirmed, desired: av.total_desired };
  });

  return (
    <div>
      {/* Progress header */}
      <div class="bg-white border-b border-line pt-6 pb-5">
        <div class="max-w-7xl mx-auto px-5 lg:px-8">
          <div class="flex items-end justify-between gap-4 mb-4">
            <div>
              <div class="text-[11px] uppercase tracking-widest text-primary-h font-bold mb-1.5">lista de presentes</div>
              <h1 class="text-2xl lg:text-4xl font-bold text-ink tracking-tight leading-tight">
                {props.products.length} presentinhos.<br class="lg:hidden" /> <span class="font-display italic font-medium text-primary">Um apê inteiro.</span>
              </h1>
            </div>
            <div class="hidden lg:block text-right">
              <div class="text-3xl font-bold text-ink">
                {progressInfo().confirmed}<span class="text-ink-3 text-xl font-medium">/{progressInfo().desired}</span>
              </div>
              <div class="text-xs uppercase tracking-wider text-ink-3 mt-1 font-semibold">reservados</div>
            </div>
          </div>
          <div class="bg-line-2 rounded-full h-2 overflow-hidden">
            <div
              class="bg-primary h-full rounded-full transition-all duration-700"
              style={{ width: `${progressInfo().pct}%` }}
            />
          </div>
          <div class="mt-2 flex items-center justify-between text-xs">
            <span class="text-ink-3">{progressInfo().pct}% completo</span>
            <span class="lg:hidden text-ink font-semibold">{progressInfo().confirmed} de {progressInfo().desired}</span>
          </div>
        </div>
      </div>

      {/* Filters sticky */}
      <div class="sticky top-14 lg:top-16 z-20 bg-white border-b border-line py-2.5">
        <div class="max-w-7xl mx-auto px-5 lg:px-8">
          <div class="flex items-center gap-2 mb-2.5">
            <div class="flex-1 relative">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              <input
                type="text"
                placeholder="Buscar presentinho..."
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
                class="w-full h-11 pl-9 pr-3 bg-line-2 border-0 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
              />
            </div>
            <select
              value={sort()}
              onChange={(e) => setSort(e.currentTarget.value as typeof sort extends () => infer T ? T : never)}
              class="hidden lg:block h-11 pl-3.5 pr-9 bg-line-2 border-0 rounded-xl text-sm cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="order">Ordem da Lina</option>
              <option value="price-asc">Preço: menor → maior</option>
              <option value="price-desc">Preço: maior → menor</option>
              <option value="title">A-Z</option>
            </select>
          </div>
          <div class="flex gap-1.5 overflow-x-auto no-scrollbar -mx-5 px-5 lg:mx-0 lg:px-0">
            <button
              type="button"
              onClick={() => setFilter('all')}
              class={`px-3.5 h-8 rounded-full border text-[13px] font-semibold whitespace-nowrap transition ${filter() === 'all' ? 'bg-ink border-ink text-white' : 'bg-white border-line text-ink-soft hover:bg-line-2'}`}
            >
              Todos
            </button>
            <For each={ROOMS}>
              {(r) => (
                <button
                  type="button"
                  onClick={() => setFilter(r)}
                  class={`px-3.5 h-8 rounded-full border text-[13px] font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${filter() === r ? 'bg-ink border-ink text-white' : 'bg-white border-line text-ink-soft hover:bg-line-2'}`}
                >
                  <span>{ROOM_ICONS[r]}</span>
                  <span>{ROOM_LABELS[r]}</span>
                </button>
              )}
            </For>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div class="max-w-7xl mx-auto px-5 lg:px-8 py-6 lg:py-10 pb-24">
        <Show
          when={filtered().length > 0}
          fallback={
            <div class="text-center py-16">
              <h3 class="text-xl font-bold text-ink mb-1.5">Nada encontrado</h3>
              <p class="text-ink-soft text-sm">Tenta outro filtro ou busca diferente.</p>
            </div>
          }
        >
          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-5">
            <For each={filtered()}>
              {(p) => {
                const av = () => availability()?.products[p.id];
                const reserved = () => av()?.qty_reservada ?? 0;
                const total = () => av()?.qty_desejada ?? p.qty_desejada;
                const available = () => av()?.available ?? p.qty_desejada;
                const soldOut = () => available() <= 0;

                return (
                  <button
                    type="button"
                    onClick={() => setSelected(p)}
                    class="text-left bg-white rounded-2xl overflow-hidden border border-line hover:border-ink hover:-translate-y-0.5 transition-all duration-200 flex flex-col group"
                  >
                    <div class="aspect-square bg-line-2 relative overflow-hidden">
                      <img
                        src={p.image_url}
                        alt={p.title}
                        loading="lazy"
                        class={`w-full h-full object-contain p-3 transition ${soldOut() ? 'opacity-30' : ''}`}
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                      <Show when={soldOut()}>
                        <div class="absolute top-2 left-2 px-2 py-0.5 bg-ink text-white text-[10px] font-bold uppercase tracking-wider rounded">esgotado</div>
                      </Show>
                      <Show when={total() > 1 && !soldOut()}>
                        <div class="absolute top-2 right-2 px-2 py-0.5 bg-white text-ink text-[10px] font-bold uppercase tracking-wider rounded border border-line">{reserved()}/{total()}</div>
                      </Show>
                    </div>
                    <div class="p-3 flex-1 flex flex-col gap-1.5">
                      <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold">{p.room}</div>
                      <div class="text-sm font-semibold text-ink leading-snug line-clamp-2 flex-1">{p.title}</div>
                      <div class="text-base lg:text-lg font-bold text-ink">{formatBRL(p.price_brl_cents)}</div>
                    </div>
                  </button>
                );
              }}
            </For>
          </div>
        </Show>
      </div>

      <Show when={selected() !== null}>
        <ProductModal
          product={selected()!}
          availability={availability()?.products[selected()!.id]}
          onClose={() => setSelected(null)}
        />
      </Show>
    </div>
  );
}
