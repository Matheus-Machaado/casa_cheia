import { createSignal, createMemo, Show, onMount, onCleanup } from 'solid-js';
import type { Product, ProductAvailability } from '~/types/shared';
import { formatBRL, formatPhoneBR, isValidEmail, isValidPhoneBR } from '~/lib/format';

interface Props {
  product: Product;
  availability: ProductAvailability | undefined;
  onClose: () => void;
}

declare const confetti: ((options: { particleCount: number; spread: number; origin: { y: number }; colors: string[] }) => void) | undefined;

export default function ProductModal(props: Props) {
  const [step, setStep] = createSignal<'detail' | 'form' | 'success'>('detail');
  const [qty, setQty] = createSignal(1);
  const [name, setName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [phone, setPhone] = createSignal('');
  const [message, setMessage] = createSignal('');
  const [submitting, setSubmitting] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [successName, setSuccessName] = createSignal('');

  const max = () => props.availability?.available ?? props.product.qty_desejada;

  const total = () => {
    const price = props.product.price_brl_cents;
    if (price == null) return null;
    return formatBRL(price * qty());
  };

  const canSubmit = createMemo(() => {
    if (submitting()) return false;
    if (name().trim().length < 2) return false;
    if (!isValidEmail(email())) return false;
    if (phone() && !isValidPhoneBR(phone())) return false;
    return true;
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
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: props.product.id,
          qty: qty(),
          guest_name: name().trim(),
          guest_email: email().trim().toLowerCase(),
          guest_phone: phone().trim() || null,
          message: message().trim() || null,
          hp_url: '',
        }),
      });
      const body = await res.json() as { data?: { guest_name: string }; error?: { message: string } };
      if (!res.ok) {
        setError(body.error?.message ?? 'Erro ao reservar');
        return;
      }
      setSuccessName(body.data!.guest_name);
      setStep('success');
      window.dispatchEvent(new CustomEvent('casacheia:reservation-created'));
      if (typeof confetti !== 'undefined') {
        confetti({ particleCount: 70, spread: 70, origin: { y: 0.6 }, colors: ['#F43F5E', '#FACC15', '#10B981'] });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      class="fixed inset-0 z-50 flex lg:items-center lg:justify-center lg:p-4"
      style="background: rgba(9,9,11,0.65);"
      onMouseDown={onBackdropMouseDown}
      onMouseUp={onBackdropMouseUp}
      role="dialog"
      aria-modal="true"
    >
      <div class="bg-white w-full h-full lg:h-auto lg:max-w-2xl lg:max-h-[90vh] overflow-y-auto lg:rounded-2xl shadow-lg flex flex-col">
        {/* Mobile header */}
        <div class="lg:hidden sticky top-0 bg-white border-b border-line px-4 h-14 flex items-center justify-between z-10">
          <button
            type="button"
            onClick={() => step() === 'form' ? setStep('detail') : props.onClose()}
            class="w-9 h-9 -ml-2 grid place-items-center text-ink"
            aria-label="Voltar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          </button>
          <div class="text-sm font-semibold text-ink">{step() === 'detail' ? 'Detalhe' : step() === 'form' ? 'Seus dados' : 'Pronto'}</div>
          <button
            type="button"
            onClick={props.onClose}
            class="w-9 h-9 -mr-2 grid place-items-center text-ink"
            aria-label="Fechar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        <Show when={step() === 'detail'}>
          <div class="grid lg:grid-cols-2 gap-0">
            <div class="bg-line-2 aspect-square lg:min-h-[420px] flex items-center justify-center p-8">
              <img src={props.product.image_url} alt={props.product.title} class="max-w-full max-h-full object-contain" loading="lazy" />
            </div>
            <div class="p-5 lg:p-7 relative">
              <button
                type="button"
                onClick={props.onClose}
                class="hidden lg:grid absolute top-5 right-5 w-9 h-9 rounded-full bg-line-2 hover:bg-line place-items-center text-ink-soft transition"
                aria-label="Fechar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              <span class="inline-block text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-line-2 text-ink-soft mb-3">{props.product.room}</span>
              <h2 class="text-2xl lg:text-3xl font-bold text-ink tracking-tight leading-tight mb-3">{props.product.title}</h2>
              <div class="flex items-baseline gap-2 mb-4">
                <span class="text-3xl font-bold text-ink">{formatBRL(props.product.price_brl_cents)}</span>
              </div>
              <div class="flex items-center gap-2 mb-4 p-3 bg-line-2 rounded-xl">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M16.5 9.4 7.5 4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>
                <span class="text-sm text-ink-soft"><strong class="text-ink">{max()} de {props.product.qty_desejada}</strong> disponível{max() === 1 ? '' : 'is'}</span>
              </div>
              <p class="text-sm text-ink-soft leading-relaxed mb-5">{props.product.description}</p>

              <div class="mb-5">
                <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-2">Quantos vai trazer</label>
                <div class="flex items-center gap-3">
                  <button type="button" onClick={() => setQty(Math.max(1, qty() - 1))} class="w-11 h-11 rounded-full bg-line-2 hover:bg-line grid place-items-center text-ink" aria-label="Menos">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <div class="text-2xl font-bold text-ink min-w-12 text-center">{qty()}</div>
                  <button type="button" onClick={() => setQty(Math.min(max(), qty() + 1))} class="w-11 h-11 rounded-full bg-line-2 hover:bg-line grid place-items-center text-ink" aria-label="Mais">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </button>
                  <Show when={total()}>
                    <div class="ml-auto text-right">
                      <div class="text-[10px] uppercase tracking-wider text-ink-3 font-bold">Total</div>
                      <div class="text-xl font-bold text-ink">{total()}</div>
                    </div>
                  </Show>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep('form')}
                disabled={max() <= 0}
                class="w-full h-12 rounded-xl bg-primary hover:bg-primary-h active:bg-primary-p text-white font-semibold transition flex items-center justify-center gap-2 shadow-pop disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Eu vou trazer
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
              </button>
              <a href={props.product.amazon_url} target="_blank" rel="noopener noreferrer" class="block mt-3 text-center text-xs text-ink-3 hover:text-ink underline underline-offset-4">Ver direto na Amazon</a>
            </div>
          </div>
        </Show>

        <Show when={step() === 'form'}>
          <div class="p-5 lg:p-7 flex-1">
            <div class="hidden lg:flex items-start justify-between mb-5">
              <div>
                <div class="text-[11px] uppercase tracking-widest text-primary-h font-bold mb-1">seus dados</div>
                <h2 class="text-2xl font-bold text-ink tracking-tight">Quase lá!</h2>
              </div>
              <button type="button" onClick={() => setStep('detail')} class="text-sm text-ink-3 hover:text-ink">← voltar</button>
            </div>
            <div class="lg:hidden mb-5">
              <h2 class="text-2xl font-bold text-ink tracking-tight">Quase lá!</h2>
              <p class="text-sm text-ink-soft mt-1">Preenche e a gente te manda o link Amazon na hora.</p>
            </div>

            <form onSubmit={submit} class="space-y-3">
              <input type="text" hidden name="hp_url" value="" />

              <div>
                <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Seu nome</label>
                <input
                  required
                  maxLength={80}
                  type="text"
                  placeholder="Ana Silva"
                  value={name()}
                  onInput={(e) => setName(e.currentTarget.value)}
                  class="w-full h-12 px-4 bg-line-2 border-0 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                />
              </div>
              <div>
                <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Email</label>
                <input
                  required
                  type="email"
                  maxLength={120}
                  placeholder="ana@email.com"
                  value={email()}
                  onInput={(e) => setEmail(e.currentTarget.value)}
                  class="w-full h-12 px-4 bg-line-2 border-0 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                />
              </div>
              <div>
                <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">
                  Telefone <span class="normal-case text-ink-3 font-medium">(opcional, pra lembrete)</span>
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={15}
                  placeholder="(11) 99999-9999"
                  value={phone()}
                  onInput={(e) => setPhone(formatPhoneBR(e.currentTarget.value))}
                  class="w-full h-12 px-4 bg-line-2 border-0 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                />
              </div>
              <div>
                <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">
                  Mensagem pra Lina <span class="normal-case text-ink-3 font-medium">(opcional)</span>
                </label>
                <textarea
                  maxLength={280}
                  rows={3}
                  placeholder="Mal posso esperar pra ver o apê pronto"
                  value={message()}
                  onInput={(e) => setMessage(e.currentTarget.value)}
                  class="w-full px-4 py-3 bg-line-2 border-0 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition resize-none"
                />
              </div>

              <Show when={error()}>
                <div class="bg-danger-s text-danger text-sm rounded-lg px-3 py-2">{error()}</div>
              </Show>

              <button
                type="submit"
                disabled={!canSubmit()}
                class="w-full h-12 rounded-xl bg-primary hover:bg-primary-h active:bg-primary-p text-white font-semibold transition flex items-center justify-center gap-2 shadow-pop disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {submitting() ? 'Enviando...' : 'Confirmar e receber link'}
                <Show when={!submitting()}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </Show>
              </button>
              <p class="text-[11px] text-ink-3 text-center leading-relaxed">Ao confirmar, você recebe o link Amazon no email agora mesmo.</p>
            </form>
          </div>
        </Show>

        <Show when={step() === 'success'}>
          <div class="p-7 text-center flex-1 flex flex-col items-center justify-center">
            <div class="w-16 h-16 rounded-full bg-success-s grid place-items-center mb-5">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-success"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <h2 class="text-2xl font-bold text-ink tracking-tight mb-2">Obrigada, <span class="font-display italic font-medium text-primary">{successName()}</span>!</h2>
            <p class="text-sm text-ink-soft leading-relaxed mb-6">Já caiu o email com o link Amazon. Compra quando quiser e me avisa no dia!</p>
            <button type="button" onClick={props.onClose} class="w-full max-w-xs h-12 rounded-xl bg-primary hover:bg-primary-h text-white font-semibold transition">
              Continuar olhando
            </button>
          </div>
        </Show>
      </div>
    </div>
  );
}
