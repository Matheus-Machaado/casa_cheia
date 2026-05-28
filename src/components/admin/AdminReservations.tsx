import { createSignal, createMemo, For, Show, onMount } from 'solid-js';
import type { Reservation, Product, MessageKind } from '~/types/shared';
import { authFetch, isLoggedIn } from '~/lib/auth';
import { confirmDialog, promptDialog, toast } from './DialogHost';

interface Props {
  products: Product[];
}

export default function AdminReservations(props: Props) {
  const [tab, setTab] = createSignal<'confirmada' | 'cancelada'>('confirmada');
  const [reservations, setReservations] = createSignal<Reservation[]>([]);
  const [allConfirmed, setAllConfirmed] = createSignal<Reservation[]>([]);
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal<string | null>(null);
  const [bulk, setBulk] = createSignal<{ kind: MessageKind; pending: Reservation[]; current: Reservation | null; total: number } | null>(null);
  const [bulkPreview, setBulkPreview] = createSignal<{ url: string; message: string } | null>(null);

  const productMap = createMemo(() => {
    const m = new Map<string, Product>();
    for (const p of props.products) m.set(p.id, p);
    return m;
  });

  const totalDesired = createMemo(() => props.products.reduce((a, p) => a + p.qty_desejada, 0));
  const totalConfirmed = createMemo(() => allConfirmed().reduce((a, r) => a + r.qty, 0));
  const isComplete = createMemo(() => totalDesired() > 0 && totalConfirmed() >= totalDesired());

  async function loadConfirmedSnapshot() {
    if (!isLoggedIn()) return;
    try {
      const res = await authFetch('/api/reservations?status=confirmada');
      if (res.ok) {
        const body = await res.json() as { data: Reservation[] };
        setAllConfirmed(body.data);
      }
    } catch {/* ignore */}
  }

  async function load() {
    if (!isLoggedIn()) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch(`/api/reservations?status=${tab()}`);
      const body = await res.json() as { data: Reservation[]; error?: { message: string } };
      if (!res.ok) {
        setError(body.error?.message ?? 'Erro ao carregar');
        return;
      }
      setReservations(body.data);
      if (tab() === 'confirmada') setAllConfirmed(body.data);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== 'session-expired') setError(msg);
    } finally {
      setLoading(false);
    }
  }

  onMount(() => {
    load();
    loadConfirmedSnapshot();
  });

  const stats = createMemo(() => {
    const all = reservations();
    const confirmed = all.filter((r) => r.status === 'confirmada').length;
    const cancelled = all.filter((r) => r.status === 'cancelada').length;
    return { confirmed, cancelled };
  });

  async function cancel(id: string) {
    const ok = await confirmDialog({
      title: 'Cancelar reserva?',
      body: 'O convidado pode já ter comprado o presente. Confirme só se quer realmente cancelar.',
      ok: 'Cancelar reserva',
      cancel: 'Voltar',
      danger: true,
    });
    if (!ok) return;
    const reason = await promptDialog({
      title: 'Motivo do cancelamento',
      body: 'Opcional — fica registrado só pra você consultar depois.',
      placeholder: 'Ex: convidado avisou que não vai',
      ok: 'Cancelar reserva',
      cancel: 'Voltar',
    });
    if (reason === null) return;
    const res = await authFetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', reason: reason || null }),
    });
    if (res.ok) {
      load();
      loadConfirmedSnapshot();
      toast('Reserva cancelada', 'ok');
    } else {
      const body = await res.json() as { error?: { message: string } };
      toast(body.error?.message ?? 'Erro ao cancelar', 'err');
    }
  }

  async function restore(id: string) {
    const res = await authFetch(`/api/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restore' }),
    });
    if (res.ok) {
      load();
      loadConfirmedSnapshot();
      toast('Reserva restaurada', 'ok');
    } else {
      const body = await res.json() as { error?: { message: string } };
      toast(body.error?.message ?? 'Erro ao restaurar', 'err');
    }
  }

  async function fetchLink(id: string, kind: MessageKind): Promise<{ url: string; message: string } | null> {
    const res = await authFetch('/api/admin/whatsapp-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservation_id: id, kind }),
    });
    const body = await res.json() as { data?: { url: string; message: string }; error?: { message: string } };
    if (res.ok && body.data) return body.data;
    toast(body.error?.message ?? 'Erro ao gerar link', 'err');
    return null;
  }

  async function openLink(id: string, kind: MessageKind) {
    const data = await fetchLink(id, kind);
    if (data) window.open(data.url, '_blank');
  }

  function startBulk(kind: MessageKind) {
    const list = allConfirmed().filter((r) => r.guest_phone);
    if (list.length === 0) {
      toast('Nenhuma reserva confirmada com telefone.', 'warn');
      return;
    }
    setBulk({ kind, pending: list, current: list[0], total: list.length });
    void primeBulkPreview(list[0], kind);
  }

  async function primeBulkPreview(r: Reservation, kind: MessageKind) {
    const data = await fetchLink(r.id, kind);
    setBulkPreview(data);
  }

  function bulkSendCurrentAndNext() {
    const b = bulk();
    const preview = bulkPreview();
    if (!b || !b.current || !preview) return;
    window.open(preview.url, '_blank');
    const remaining = b.pending.slice(1);
    if (remaining.length === 0) {
      setBulk(null);
      setBulkPreview(null);
      return;
    }
    const next = remaining[0];
    setBulk({ ...b, pending: remaining, current: next });
    setBulkPreview(null);
    void primeBulkPreview(next, b.kind);
  }

  function bulkSkipCurrent() {
    const b = bulk();
    if (!b) return;
    const remaining = b.pending.slice(1);
    if (remaining.length === 0) {
      setBulk(null);
      setBulkPreview(null);
      return;
    }
    const next = remaining[0];
    setBulk({ ...b, pending: remaining, current: next });
    setBulkPreview(null);
    void primeBulkPreview(next, b.kind);
  }

  function bulkCancel() {
    setBulk(null);
    setBulkPreview(null);
  }

  const kindLabels: Record<MessageKind, string> = {
    'reminder': 'Lembrete pré-chá',
    'thankyou-complete': 'Agradecimento (lista completa)',
    'thankyou-post': 'Agradecimento (pós-chá)',
  };

  return (
    <div>
      <div class="bg-white border-b border-line">
        <div class="max-w-7xl mx-auto px-5 lg:px-8 py-5 lg:py-7">
          <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
            <div class="bg-line-2 rounded-xl p-3.5">
              <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">confirmadas</div>
              <div class="text-2xl lg:text-3xl font-bold text-ink">{stats().confirmed}</div>
            </div>
            <div class="bg-line-2 rounded-xl p-3.5">
              <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">canceladas</div>
              <div class="text-2xl lg:text-3xl font-bold text-ink-soft">{stats().cancelled}</div>
            </div>
            <div class="bg-line-2 rounded-xl p-3.5">
              <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">progresso</div>
              <div class="text-2xl lg:text-3xl font-bold text-ink">{totalDesired() > 0 ? Math.round((totalConfirmed() / totalDesired()) * 100) : 0}%</div>
            </div>
            <div class="bg-line-2 rounded-xl p-3.5">
              <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">atualizar</div>
              <button type="button" onClick={() => { load(); loadConfirmedSnapshot(); }} class="text-sm font-semibold text-primary-h hover:text-primary-p flex items-center gap-1 cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                Refresh
              </button>
            </div>
          </div>

          <div class="bg-line-2 rounded-xl p-3 flex flex-col lg:flex-row lg:items-center gap-2.5">
            <div class="flex-1 min-w-0">
              <div class="text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-0.5">disparo personalizado</div>
              <div class="text-xs text-ink-soft">Abre o WhatsApp da Lina com mensagem prontinha por convidado — só dar enviar.</div>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button type="button" onClick={() => startBulk('reminder')} disabled={allConfirmed().length === 0} class="h-9 px-3 rounded-lg bg-white border border-line hover:border-ink text-xs font-semibold text-ink transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                Lembrar todos
              </button>
              <button type="button" onClick={() => startBulk('thankyou-complete')} disabled={!isComplete()} class="h-9 px-3 rounded-lg bg-white border border-line hover:border-ink text-xs font-semibold text-ink transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed" title={isComplete() ? '' : 'Habilita quando 100% comprado'}>
                Agradecer (lista completa)
              </button>
              <button type="button" onClick={() => startBulk('thankyou-post')} disabled={allConfirmed().length === 0} class="h-9 px-3 rounded-lg bg-white border border-line hover:border-ink text-xs font-semibold text-ink transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed">
                Agradecer (pós-chá)
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
            class={`px-3 lg:px-4 h-10 text-sm font-semibold relative -mb-px cursor-pointer ${tab() === 'confirmada' ? 'border-b-2 border-ink text-ink' : 'text-ink-3 hover:text-ink'}`}
          >
            Confirmadas
          </button>
          <button
            type="button"
            onClick={() => { setTab('cancelada'); load(); }}
            class={`px-3 lg:px-4 h-10 text-sm font-semibold relative -mb-px cursor-pointer ${tab() === 'cancelada' ? 'border-b-2 border-ink text-ink' : 'text-ink-3 hover:text-ink'}`}
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
                      <div class="text-[11px] text-ink-3 mt-0.5 truncate">{r.guest_phone || 'sem telefone'}</div>
                    </div>
                  </div>
                  <Show when={r.message}>
                    <div class="hidden lg:block max-w-[200px] text-xs italic text-ink-soft border-l-2 border-line pl-3">"{r.message}"</div>
                  </Show>
                  <div class="flex flex-wrap items-center gap-1.5">
                    <Show when={r.status === 'confirmada' && r.guest_phone}>
                      <button type="button" onClick={() => openLink(r.id, 'reminder')} title="Lembrete pré-chá" class="h-9 px-3 rounded-lg bg-line-2 hover:bg-line text-xs font-semibold text-ink transition flex items-center gap-1.5 cursor-pointer">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                        Lembrar
                      </button>
                      <button type="button" onClick={() => openLink(r.id, 'thankyou-complete')} disabled={!isComplete()} title={isComplete() ? 'Agradecimento (lista completa)' : 'Habilita quando 100% comprado'} class="h-9 px-3 rounded-lg bg-line-2 hover:bg-line text-xs font-semibold text-ink transition flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-line-2">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                        Comemorar
                      </button>
                      <button type="button" onClick={() => openLink(r.id, 'thankyou-post')} title="Agradecimento (pós-chá)" class="h-9 px-3 rounded-lg bg-line-2 hover:bg-line text-xs font-semibold text-ink transition flex items-center gap-1.5 cursor-pointer">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
                        Pós-chá
                      </button>
                    </Show>
                    <Show when={r.status === 'confirmada'}>
                      <button type="button" onClick={() => cancel(r.id)} title="Cancelar reserva" class="h-9 px-3 rounded-lg bg-line-2 hover:bg-danger-s text-xs font-semibold text-ink-soft hover:text-danger transition flex items-center gap-1.5 cursor-pointer">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </Show>
                    <Show when={r.status === 'cancelada'}>
                      <button type="button" onClick={() => restore(r.id)} title="Restaurar reserva" class="h-9 px-3 rounded-lg bg-line-2 hover:bg-success-s text-xs font-semibold text-ink-soft hover:text-success transition flex items-center gap-1.5 cursor-pointer">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
                      </button>
                    </Show>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>

      <Show when={bulk()}>
        {(b) => (
          <div class="fixed inset-0 z-50 grid place-items-center p-4 bg-black/60">
            <div class="bg-white rounded-2xl max-w-md w-full p-5 lg:p-6">
              <div class="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div class="text-[11px] uppercase tracking-widest text-primary-h font-bold mb-1">{kindLabels[b().kind]}</div>
                  <h3 class="text-lg font-bold text-ink tracking-tight">Disparar pra {b().total} convidado{b().total === 1 ? '' : 's'}</h3>
                </div>
                <button type="button" onClick={bulkCancel} class="text-ink-3 hover:text-ink cursor-pointer" aria-label="Fechar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>

              <Show when={b().current}>
                {(curr) => (
                  <div class="space-y-3">
                    <div class="bg-line-2 rounded-xl p-3">
                      <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">próximo</div>
                      <div class="font-semibold text-ink text-sm">{curr().guest_name} · {curr().guest_phone}</div>
                      <div class="text-xs text-ink-soft">{curr().qty}× {productMap().get(curr().product_id)?.title ?? curr().product_id}</div>
                    </div>

                    <Show when={bulkPreview()} fallback={<div class="text-center py-4 text-ink-3 text-xs">Carregando preview…</div>}>
                      {(prev) => (
                        <div class="bg-line-2 rounded-xl p-3 max-h-48 overflow-y-auto">
                          <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold mb-1">mensagem</div>
                          <pre class="text-xs text-ink whitespace-pre-wrap font-sans leading-relaxed">{prev().message}</pre>
                        </div>
                      )}
                    </Show>

                    <div class="flex items-center gap-2 pt-2">
                      <button type="button" onClick={bulkSkipCurrent} class="flex-1 h-10 rounded-xl bg-line-2 hover:bg-line text-sm font-semibold text-ink-soft transition cursor-pointer">
                        Pular
                      </button>
                      <button type="button" onClick={bulkSendCurrentAndNext} disabled={!bulkPreview()} class="flex-[2] h-10 rounded-xl bg-primary hover:bg-primary-h text-white text-sm font-semibold transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        Abrir no WhatsApp →
                      </button>
                    </div>

                    <div class="text-center text-[11px] text-ink-3">
                      restam {b().pending.length} de {b().total}
                    </div>
                  </div>
                )}
              </Show>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
