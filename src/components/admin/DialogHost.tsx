import { createSignal, Show, For, onMount, onCleanup } from 'solid-js';

// ──────────────────────────────────────────────────────────────────────
// State store global (signals) + funções utilitárias importáveis
// ──────────────────────────────────────────────────────────────────────

type DialogKind = 'confirm' | 'prompt';

interface DialogState {
  kind: DialogKind;
  title: string;
  body?: string;
  placeholder?: string;
  okLabel: string;
  cancelLabel: string;
  danger?: boolean;
  initialValue?: string;
  resolve: (value: boolean | string | null) => void;
}

interface ToastState {
  id: number;
  text: string;
  kind: 'info' | 'ok' | 'err' | 'warn';
  timeoutMs: number;
}

const [dialog, setDialog] = createSignal<DialogState | null>(null);
const [toasts, setToasts] = createSignal<ToastState[]>([]);
let nextToastId = 1;

// ──────────────────────────────────────────────────────────────────────
// API pública (chamável de qualquer componente)
// ──────────────────────────────────────────────────────────────────────

export function confirmDialog(opts: {
  title: string;
  body?: string;
  ok?: string;
  cancel?: string;
  danger?: boolean;
}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    setDialog({
      kind: 'confirm',
      title: opts.title,
      body: opts.body,
      okLabel: opts.ok ?? 'Confirmar',
      cancelLabel: opts.cancel ?? 'Cancelar',
      danger: opts.danger,
      resolve: (v) => resolve(v === true),
    });
  });
}

export function promptDialog(opts: {
  title: string;
  body?: string;
  placeholder?: string;
  ok?: string;
  cancel?: string;
  initial?: string;
}): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    setDialog({
      kind: 'prompt',
      title: opts.title,
      body: opts.body,
      placeholder: opts.placeholder,
      okLabel: opts.ok ?? 'Salvar',
      cancelLabel: opts.cancel ?? 'Cancelar',
      initialValue: opts.initial ?? '',
      resolve: (v) => resolve(typeof v === 'string' ? v : null),
    });
  });
}

export function toast(text: string, kind: ToastState['kind'] = 'info', timeoutMs = 3500): void {
  const id = nextToastId++;
  setToasts((curr) => [...curr, { id, text, kind, timeoutMs }]);
  setTimeout(() => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, timeoutMs);
}

// ──────────────────────────────────────────────────────────────────────
// Componentes
// ──────────────────────────────────────────────────────────────────────

export default function DialogHost() {
  const [inputValue, setInputValue] = createSignal('');
  let inputEl: HTMLInputElement | undefined;
  let mouseDownOnBackdrop = false;

  function onBackdropMouseDown(e: MouseEvent) {
    mouseDownOnBackdrop = e.target === e.currentTarget;
  }
  function onBackdropMouseUp(e: MouseEvent, d: DialogState) {
    if (mouseDownOnBackdrop && e.target === e.currentTarget) {
      d.resolve(d.kind === 'prompt' ? null : false);
      setDialog(null);
    }
    mouseDownOnBackdrop = false;
  }

  function close(d: DialogState, value: boolean | string | null) {
    d.resolve(value);
    setDialog(null);
  }

  // Setup quando dialog abre: foca input, reset value
  onMount(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = dialog();
      if (!d) return;
      if (e.key === 'Escape') {
        d.resolve(d.kind === 'prompt' ? null : false);
        setDialog(null);
      } else if (e.key === 'Enter' && d.kind === 'prompt') {
        e.preventDefault();
        close(d, inputValue());
      }
    };
    window.addEventListener('keydown', onKey);
    onCleanup(() => window.removeEventListener('keydown', onKey));
  });

  return (
    <>
      <Show when={dialog()}>
        {(d) => {
          // reset input toda vez que dialog abre
          queueMicrotask(() => {
            setInputValue(d().initialValue ?? '');
            if (inputEl) {
              inputEl.value = d().initialValue ?? '';
              inputEl.focus();
              inputEl.select();
            }
          });

          return (
            <div
              class="fixed inset-0 z-[100] grid place-items-end lg:place-items-center p-0 lg:p-4"
              style="background: rgba(9,9,11,0.55); backdrop-filter: blur(2px);"
              role="dialog"
              aria-modal="true"
              onMouseDown={onBackdropMouseDown}
              onMouseUp={(e) => onBackdropMouseUp(e, d())}
            >
              <div class="bg-white w-full lg:max-w-md rounded-t-2xl lg:rounded-2xl shadow-2xl overflow-hidden">
                <div class="p-5 lg:p-6">
                  <h3 class="text-lg font-bold text-ink tracking-tight">{d().title}</h3>
                  <Show when={d().body}>
                    <p class="text-sm text-ink-soft mt-1.5 leading-relaxed">{d().body}</p>
                  </Show>

                  <Show when={d().kind === 'prompt'}>
                    <div class="mt-4">
                      <input
                        ref={(el) => (inputEl = el)}
                        type="text"
                        placeholder={d().placeholder ?? ''}
                        value={inputValue()}
                        onInput={(e) => setInputValue(e.currentTarget.value)}
                        class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                      />
                    </div>
                  </Show>
                </div>

                <div class="p-3 lg:p-4 bg-line-2 flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => close(d(), d().kind === 'prompt' ? null : false)}
                    class="h-10 px-4 rounded-xl bg-white hover:bg-line text-sm font-semibold text-ink-soft transition cursor-pointer"
                  >
                    {d().cancelLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => close(d(), d().kind === 'prompt' ? inputValue() : true)}
                    class={`h-10 px-4 rounded-xl text-sm font-semibold text-white transition cursor-pointer ${d().danger ? 'bg-danger hover:opacity-90' : 'bg-primary hover:bg-primary-h'}`}
                  >
                    {d().okLabel}
                  </button>
                </div>
              </div>
            </div>
          );
        }}
      </Show>

      <div class="fixed top-4 right-4 left-4 lg:left-auto lg:max-w-sm z-[200] flex flex-col gap-2 pointer-events-none">
        <For each={toasts()}>
          {(t) => (
            <div
              class={`rounded-xl shadow-lg px-4 py-3 text-sm font-medium pointer-events-auto animate-toast-in ${
                t.kind === 'ok' ? 'bg-success text-white' :
                t.kind === 'err' ? 'bg-danger text-white' :
                t.kind === 'warn' ? 'bg-warn text-ink' :
                'bg-ink text-white'
              }`}
            >
              {t.text}
            </div>
          )}
        </For>
      </div>
    </>
  );
}
