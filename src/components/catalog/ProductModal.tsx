import { createSignal, createMemo, createEffect, Show, onMount, onCleanup } from 'solid-js';
import type { Product, ProductAvailability } from '~/types/shared';
import { formatBRL, formatPhoneBR, isValidPhoneBR } from '~/lib/format';

interface Props {
  product: Product;
  roomLabel: string;
  availability: ProductAvailability | undefined;
  onClose: () => void;
}

// Amazon BR não respeita confiavelmente o endpoint gp/aws/cart/add.html
// pra clientes sem credencial de afiliado — abre o carrinho vazio.
// Mantemos o link direto do produto; a quantidade vive no nosso sistema
// e o convidado ajusta no carrinho da Amazon se precisar.

export default function ProductModal(props: Props) {
  const [name, setName] = createSignal('');
  const [phone, setPhone] = createSignal('');
  const [qty, setQty] = createSignal(1);
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);

  const available = () => props.availability?.available ?? props.product.qty_desejada;
  const isSoldOut = () => available() <= 0;
  const hasQtyChoice = () => available() > 1;

  // Default: pega todos os disponíveis. Reage a mudanças de availability
  // (ex: outra reserva chega via polling) sem reset se já passou da
  // primeira renderização.
  createEffect(() => {
    const av = available();
    if (av > 0) setQty((prev) => Math.min(Math.max(prev, av), av));
  });

  const canSubmit = createMemo(() => {
    if (submitting()) return false;
    if (isSoldOut()) return false;
    if (qty() < 1 || qty() > available()) return false;
    if (name().trim().length < 2) return false;
    // Phone é opcional, mas se preenchido precisa ser válido
    if (phone().trim() && !isValidPhoneBR(phone())) return false;
    return true;
  });

  function clampQty(n: number): number {
    if (!isFinite(n)) return 1;
    return Math.max(1, Math.min(available(), Math.round(n)));
  }

  const lineTotal = createMemo(() => {
    const cents = props.product.price_brl_cents;
    if (cents === null) return null;
    return cents * qty();
  });

  let mouseDownOnBackdrop = false;
  function onBackdropMouseDown(e: MouseEvent) {
    mouseDownOnBackdrop = (e.target === e.currentTarget);
  }
  function onBackdropMouseUp(e: MouseEvent) {
    if (mouseDownOnBackdrop && e.target === e.currentTarget) {
      props.onClose();
    }
    mouseDownOnBackdrop = false;
  }

  onMount(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') props.onClose(); };
    window.addEventListener('keydown', onKey);
    onCleanup(() => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    });
  });

  async function submit(e: Event) {
    e.preventDefault();
    if (!canSubmit()) return;
    setSubmitting(true);
    setError(null);
    try {
      const finalQty = clampQty(qty());
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: props.product.id,
          qty: finalQty,
          guest_name: name().trim(),
          guest_phone: phone().trim() || null,
          hp_url: '',
        }),
      });
      const body = await res.json() as { error?: { message: string } };
      if (!res.ok) {
        setError(body.error?.message ?? 'Erro ao reservar');
        setSubmitting(false);
        return;
      }
      window.dispatchEvent(new CustomEvent('casacheia:reservation-created'));
      // Redirect direto pra página do produto na Amazon — qtd já foi
      // reservada no nosso sistema; convidado ajusta no carrinho lá se
      // precisar.
      window.location.assign(props.product.amazon_url);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <div
      class="fixed inset-0 z-50 flex lg:items-center lg:justify-center lg:p-4"
      style="background: rgba(9,9,11,0.65); backdrop-filter: blur(2px);"
      onMouseDown={onBackdropMouseDown}
      onMouseUp={onBackdropMouseUp}
      role="dialog"
      aria-modal="true"
      aria-label={`Reservar ${props.product.title}`}
    >
      <div class="bg-white w-full h-full lg:h-auto lg:max-w-lg lg:max-h-[92vh] overflow-y-auto lg:rounded-2xl shadow-lg flex flex-col">
        {/* Header */}
        <div class="sticky top-0 bg-white border-b border-line px-5 h-14 flex items-center justify-between z-10">
          <span class="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-line-2 text-ink-soft">{props.roomLabel}</span>
          <button
            type="button"
            onClick={props.onClose}
            class="w-9 h-9 -mr-2 grid place-items-center text-ink-soft hover:text-ink rounded-lg hover:bg-line-2 transition cursor-pointer"
            aria-label="Fechar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* Body */}
        <div class="flex-1 p-5 lg:p-6 flex flex-col gap-5">
          {/* Imagem */}
          <div class="bg-line-2 aspect-square w-full max-w-[260px] mx-auto rounded-2xl flex items-center justify-center p-5">
            <img
              src={props.product.image_url}
              alt={props.product.title}
              class={`max-w-full max-h-full object-contain ${isSoldOut() ? 'opacity-40' : ''}`}
              loading="lazy"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          </div>

          {/* Info */}
          <div>
            <h2 class="text-xl lg:text-2xl font-bold text-ink tracking-tight leading-snug">{props.product.title}</h2>
            <div class="mt-2 flex items-baseline gap-2 flex-wrap">
              <span class="text-2xl font-bold text-ink">{formatBRL(props.product.price_brl_cents)}</span>
              <Show when={props.product.qty_desejada > 1}>
                <span class="text-xs text-ink-3">por unidade</span>
              </Show>
            </div>
            <p class="mt-3 text-sm text-ink-soft leading-relaxed">{props.product.description}</p>
          </div>

          {/* Form ou estado esgotado */}
          <Show
            when={!isSoldOut()}
            fallback={
              <div class="rounded-xl bg-ink text-white p-4 flex items-start gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
                <div class="flex-1">
                  <div class="font-semibold text-sm">Alguém já vai trazer esse</div>
                  <div class="text-xs text-white/70 mt-0.5">Dá uma olhada nos outros — tem coisa boa.</div>
                </div>
              </div>
            }
          >
            <form onSubmit={submit} class="flex flex-col gap-3">
              <input type="text" hidden name="hp_url" value="" />

              <Show when={hasQtyChoice()}>
                <div class="rounded-xl bg-line-2 p-3 flex items-center gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="text-[11px] uppercase tracking-wider text-ink-3 font-bold">Quantos vai levar?</div>
                    <div class="text-[11px] text-ink-3 mt-0.5">
                      A Lina quer {props.product.qty_desejada} no total.
                      <Show when={available() < props.product.qty_desejada}>
                        <span> Disponíveis agora: <strong>{available()}</strong>.</span>
                      </Show>
                    </div>
                  </div>
                  <div class="flex items-center bg-white rounded-lg overflow-hidden h-10 focus-within:ring-2 focus-within:ring-primary shrink-0">
                    <button
                      type="button"
                      onClick={() => setQty(clampQty(qty() - 1))}
                      disabled={qty() <= 1}
                      class="h-10 w-10 grid place-items-center text-ink-soft hover:text-ink hover:bg-line-2 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Diminuir"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                    <div class="w-10 h-10 grid place-items-center text-base font-bold text-ink select-none">{qty()}</div>
                    <button
                      type="button"
                      onClick={() => setQty(clampQty(qty() + 1))}
                      disabled={qty() >= available()}
                      class="h-10 w-10 grid place-items-center text-ink-soft hover:text-ink hover:bg-line-2 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Aumentar"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </button>
                  </div>
                </div>
                <Show when={lineTotal() !== null && qty() > 1}>
                  <div class="-mt-1 flex items-center justify-end gap-2 text-xs text-ink-3">
                    <span>{qty()}× {formatBRL(props.product.price_brl_cents)} =</span>
                    <strong class="text-ink text-sm">{formatBRL(lineTotal())}</strong>
                  </div>
                </Show>
                <Show when={qty() > 1}>
                  <p class="-mt-1 text-[11px] text-ink-3 leading-relaxed">
                    Ajuste a quantidade pra <strong>{qty()}</strong> no carrinho da Amazon antes de finalizar.
                  </p>
                </Show>
              </Show>

              <div>
                <label for="guest_name" class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Seu nome</label>
                <input
                  id="guest_name"
                  required
                  autofocus
                  maxLength={80}
                  type="text"
                  placeholder="Ana Silva"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  class="w-full h-12 px-4 bg-line-2 border-0 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                />
              </div>

              <div>
                <label for="guest_phone" class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">
                  Telefone <span class="normal-case text-ink-3 font-medium">(opcional)</span>
                </label>
                <input
                  id="guest_phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="(11) 99999-9999"
                  value={phone()}
                  onInput={(e) => setPhone(formatPhoneBR(e.currentTarget.value))}
                  class="w-full h-12 px-4 bg-line-2 border-0 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                />
                <p class="text-[11px] text-ink-3 mt-1.5">Se quiser que a Lina te lembre antes do chá.</p>
              </div>

              <Show when={error()}>
                <div class="bg-danger-s text-danger text-sm rounded-lg px-3 py-2">{error()}</div>
              </Show>

              <button
                type="submit"
                disabled={!canSubmit()}
                class="h-12 mt-1 rounded-xl bg-primary hover:bg-primary-h active:bg-primary-p text-white font-semibold transition flex items-center justify-center gap-2 shadow-pop disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {submitting() ? 'Reservando…' : (qty() > 1 ? `Confirmar ${qty()} e abrir Amazon` : 'Confirmar e abrir Amazon')}
                <Show when={!submitting()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Show>
              </button>

            </form>
          </Show>
        </div>
      </div>
    </div>
  );
}
