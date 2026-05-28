import { createSignal, Show } from 'solid-js';
import type { Product } from '~/types/shared';
import AdminReservations from './AdminReservations';
import AdminSettings from './AdminSettings';

interface Props {
  products: Product[];
}

type Tab = 'reservas' | 'configuracoes';

export default function AdminPanel(props: Props) {
  const [tab, setTab] = createSignal<Tab>('reservas');

  return (
    <div>
      <div class="bg-white border-b border-line sticky top-0 z-20">
        <div class="max-w-7xl mx-auto px-5 lg:px-8">
          <div class="flex items-center gap-1 h-12">
            <button
              type="button"
              onClick={() => setTab('reservas')}
              class={`px-3 lg:px-4 h-full text-sm font-semibold relative ${tab() === 'reservas' ? 'text-ink' : 'text-ink-3 hover:text-ink'}`}
            >
              Reservas
              <Show when={tab() === 'reservas'}>
                <span class="absolute left-0 right-0 bottom-0 h-0.5 bg-primary" />
              </Show>
            </button>
            <button
              type="button"
              onClick={() => setTab('configuracoes')}
              class={`px-3 lg:px-4 h-full text-sm font-semibold relative ${tab() === 'configuracoes' ? 'text-ink' : 'text-ink-3 hover:text-ink'}`}
            >
              Configurações
              <Show when={tab() === 'configuracoes'}>
                <span class="absolute left-0 right-0 bottom-0 h-0.5 bg-primary" />
              </Show>
            </button>
            <div class="ml-auto hidden lg:flex items-center gap-2">
              <a href="/" class="h-9 px-3 rounded-lg bg-line-2 hover:bg-line text-xs font-semibold text-ink transition flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                Ver site
              </a>
              <button
                type="button"
                onClick={() => {
                  const w = window as unknown as { netlifyIdentity?: { logout: () => void } };
                  if (w.netlifyIdentity) w.netlifyIdentity.logout();
                }}
                class="h-9 px-3 rounded-lg bg-line-2 hover:bg-line text-xs font-semibold text-ink-soft transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>

      <Show when={tab() === 'reservas'}>
        <AdminReservations products={props.products} />
      </Show>
      <Show when={tab() === 'configuracoes'}>
        <AdminSettings />
      </Show>
    </div>
  );
}
