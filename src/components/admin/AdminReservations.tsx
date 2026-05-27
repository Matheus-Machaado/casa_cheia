import { createSignal, createMemo, For, Show, onMount } from 'solid-js';
import type { Reservation, Product } from '~/types/shared';
import { formatBRL } from '~/lib/format';

interface Props {
  products: Product[];
}

export default function AdminReservations(props: Props) {
  const [tab, setTab] = createSignal<'confirmada' | 'cancelada'>('confirmada');
  const [reservations, setReservations] = createSignal<Reservation[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);

  const productMap = createMemo(() => {
    const m = new Map<string, Product>();
    for (const p of props.products) m.set(p.id, p);
    return m;
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reservations?status=${tab()}`, { credentials: 'include' });
      if (res.status === 401) {
        setError('Sessão expirou. Recarrega a página e faz login de novo.');
        return;
      }
      const body = await res.json() as { data: Reservation[]; error?: { message: string } };
      if (!res.ok) {
        setError(body.error?.message ?? 'Erro ao carregar');
        return;
      }
      setReservations(body.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  onMount(load);

  const stats = createMemo(() => {
    const all = reservations();
    const confirmed = all.filter((r) => r.status === 'confirmada').length;
    const cancelled = all.filter((r) => r.status === 'cancelada').length;
    return { confirmed, cancelled };
  });

  async function cancel(id: string) {
    if (!confirm('Tem certeza? O convidado pode já ter comprado o item.')) return;
    const reason = prompt('Motivo (opcional, só pra você):') ?? null;
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'cancel', reason }),
    });
    if (res.ok) {
      load();
    } else {
      const body = await res.json() as { error?: { message: string } };
      alert(body.error?.message ?? 'Erro ao cancelar');
    }
  }

  async function restore(id: string) {
    const res = await fetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ action: 'restore' }),
    });
    if (res.ok) {
      load();
    } else {
      const body = await res.json() as { error?: { message: string } };
      alert(body.error?.message ?? 'Erro ao restaurar');
    }
  }

  async function openWhatsApp(id: string) {
    const res = await fetch('/api/admin/whatsapp-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reservation_id: id }),
    });
    const body = await res.json() as { data?: { url: string }; error?: { message: string } };
    if (res.ok && body.data) {
      window.open(body.data.url, '_blank');
    } else {
      alert(body.error?.message ?? 'Erro ao gerar link');
    }
  }

  return (
    <div>
      <div class="bg-white border-b border-line">
        <div class="max-w-7xl mx-auto px-5 lg:px-8 py-5 lg:py-7">
          <div class="flex items-start justify-between gap-4 mb-5">
            <div>
              <div class="text-[11px] uppercase tracking-widest text-primary-h font-bold mb-1.5">painel admin</div>
              <h1 class="text-2xl lg:text-3xl font-bold text-ink tracking-tight">Painel da <span class="font-display italic font-medium text-primary">Lina</span></h1>
            </div>
            <div class="hidden lg:flex items-center gap-2">
              <a href="/" class="h-10 px-4 rounded-xl bg-line-2 hover:bg-line text-sm font-semibold text-ink transition flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Ver site público
              </a>
            </div>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            <div class="bg-line-2 rounded-xl p-3.5">
              <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">confirmadas</div>
              <div class="text-2xl lg:text-3xl font-bold text-ink">{stats().confirmed}</div>
            </div>
            <div class="bg-line-2 rounded-xl p-3.5">
              <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">canceladas</div>
              <div class="text-2xl lg:text-3xl font-bold text-ink-soft">{stats().cancelled}</div>
            </div>
            <div class="bg-line-2 rounded-xl p-3.5">
              <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">presentes</div>
              <div class="text-2xl lg:text-3xl font-bold text-ink">{props.products.length}</div>
            </div>
            <div class="bg-line-2 rounded-xl p-3.5">
              <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">atualizar</div>
              <button type="button" onClick={load} class="text-sm font-semibold text-primary-h hover:text-primary-p flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="max-w-7xl mx-auto px-5 lg:px-8 py-5 lg:py-7">
        <div class="flex items-center gap-2 mb-4 border-b border-line">
          <button
            type="button"
            onClick={() => { setTab('confirmada'); load(); }}
            class={`px-3 lg:px-4 h-10 text-sm font-semibold relative -mb-px ${tab() === 'confirmada' ? 'border-b-2 border-ink text-ink' : 'text-ink-3 hover:text-ink'}`}
          >
            Confirmadas
          </button>
          <button
            type="button"
            onClick={() => { setTab('cancelada'); load(); }}
            class={`px-3 lg:px-4 h-10 text-sm font-semibold relative -mb-px ${tab() === 'cancelada' ? 'border-b-2 border-ink text-ink' : 'text-ink-3 hover:text-ink'}`}
          >
            Canceladas
          </button>
        </div>

        <Show when={error()}>
          <div class="bg-danger-s text-danger text-sm rounded-lg px-4 py-3 mb-4">{error()}</div>
        </Show>

        <Show when={loading()}>
          <div class="text-center py-10 text-ink-3 text-sm">Carregando…</div>
        </Show>

        <Show when={!loading() && reservations().length === 0}>
          <div class="text-center py-12 text-ink-3">
            <p class="text-sm">{tab() === 'confirmada' ? 'Nenhuma reserva confirmada ainda.' : 'Nenhuma reserva cancelada.'}</p>
          </div>
        </Show>

        <div class="space-y-2.5">
          <For each={reservations()}>
            {(r) => {
              const p = productMap().get(r.product_id);
              const date = new Date(r.created_at);
              const dateStr = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
              return (
                <div class="bg-white border border-line rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-4">
                  <div class="flex items-center gap-3 flex-1 min-w-0">
                    <div class="w-12 h-12 lg:w-14 lg:h-14 rounded-xl bg-line-2 grid place-items-center overflow-hidden flex-shrink-0">
                      <Show when={p}>
                        <img src={p!.image_url} alt={p!.title} class="max-w-full max-h-full object-contain p-1" onError={(e) => (e.currentTarget.style.display = 'none')} />
                      </Show>
                    </div>
                    <div class="flex-1 min-w-0">
                      <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-0.5">{dateStr}</div>
                      <div class="font-semibold text-ink text-sm truncate">{r.guest_name}</div>
                      <div class="text-xs text-ink-soft truncate">{r.qty}× {p?.title ?? r.product_id}</div>
                      <div class="text-[11px] text-ink-3 mt-0.5 truncate">{r.guest_email}{r.guest_phone ? ` · ${r.guest_phone}` : ' · sem telefone'}</div>
                    </div>
                  </div>
                  <Show when={r.message}>
                    <div class="hidden lg:block max-w-[200px] text-xs italic text-ink-soft border-l-2 border-line pl-3">"{r.message}"</div>
                  </Show>
                  <div class="flex items-center gap-1.5 lg:gap-2">
                    <Show when={r.status === 'confirmada' && r.guest_phone}>
                      <button type="button" onClick={() => openWhatsApp(r.id)} class="h-9 px-3 rounded-lg bg-line-2 hover:bg-line text-xs font-semibold text-ink transition flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
                        WhatsApp
                      </button>
                    </Show>
                    <Show when={r.status === 'confirmada'}>
                      <button type="button" onClick={() => cancel(r.id)} class="h-9 px-3 rounded-lg bg-line-2 hover:bg-danger-s text-xs font-semibold text-ink-soft hover:text-danger transition flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        Cancelar
                      </button>
                    </Show>
                    <Show when={r.status === 'cancelada'}>
                      <button type="button" onClick={() => restore(r.id)} class="h-9 px-3 rounded-lg bg-line-2 hover:bg-success-s text-xs font-semibold text-ink-soft hover:text-success transition flex items-center gap-1.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                        Restaurar
                      </button>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
    </div>
  );
}
