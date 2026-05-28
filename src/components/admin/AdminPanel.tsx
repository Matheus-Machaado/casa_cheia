import { createSignal, Show, onMount } from 'solid-js';
import type { Product } from '~/types/shared';
import AdminReservations from './AdminReservations';
import AdminSettings from './AdminSettings';
import AdminProducts from './AdminProducts';
import DialogHost from './DialogHost';
import { currentUser, logout } from '~/lib/auth';

interface Props {
  products: Product[];
}

type Tab = 'reservas' | 'produtos' | 'configuracoes';

export default function AdminPanel(props: Props) {
  const [tab, setTab] = createSignal<Tab>('reservas');
  const [userEmail, setUserEmail] = createSignal('');

  onMount(() => {
    const u = currentUser();
    if (u) setUserEmail(u.email);
  });

  function handleLogout() {
    logout();
    window.location.reload();
  }

  return (
    <div>
      <div class="bg-white border-b border-line sticky top-0 z-20">
        <div class="max-w-7xl mx-auto px-5 lg:px-8">
          <div class="flex items-center gap-1 h-12">
            <button
              type="button"
              onClick={() => setTab('reservas')}
              class={`px-3 lg:px-4 h-full text-sm font-semibold relative cursor-pointer ${tab() === 'reservas' ? 'text-ink' : 'text-ink-3 hover:text-ink'}`}
            >
              Reservas
              <Show when={tab() === 'reservas'}>
                <span class="absolute left-0 right-0 bottom-0 h-0.5 bg-primary" />
              </Show>
            </button>
            <button
              type="button"
              onClick={() => setTab('produtos')}
              class={`px-3 lg:px-4 h-full text-sm font-semibold relative cursor-pointer ${tab() === 'produtos' ? 'text-ink' : 'text-ink-3 hover:text-ink'}`}
            >
              Produtos
              <Show when={tab() === 'produtos'}>
                <span class="absolute left-0 right-0 bottom-0 h-0.5 bg-primary" />
              </Show>
            </button>
            <button
              type="button"
              onClick={() => setTab('configuracoes')}
              class={`px-3 lg:px-4 h-full text-sm font-semibold relative cursor-pointer ${tab() === 'configuracoes' ? 'text-ink' : 'text-ink-3 hover:text-ink'}`}
            >
              Configurações
              <Show when={tab() === 'configuracoes'}>
                <span class="absolute left-0 right-0 bottom-0 h-0.5 bg-primary" />
              </Show>
            </button>
            <div class="ml-auto flex items-center gap-2">
              <Show when={userEmail()}>
                <span class="hidden lg:inline text-xs text-ink-3">{userEmail()}</span>
              </Show>
              <a href="/" class="h-9 px-3 rounded-lg bg-line-2 hover:bg-line text-xs font-semibold text-ink transition flex items-center gap-2 cursor-pointer">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                <span class="hidden sm:inline">Ver site</span>
              </a>
              <button
                type="button"
                onClick={handleLogout}
                title="Sair"
                class="h-9 px-3 rounded-lg bg-line-2 hover:bg-line text-xs font-semibold text-ink-soft transition cursor-pointer flex items-center gap-1.5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span class="hidden sm:inline">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Show when={tab() === 'reservas'}>
        <AdminReservations products={props.products} />
      </Show>
      <Show when={tab() === 'produtos'}>
        <AdminProducts />
      </Show>
      <Show when={tab() === 'configuracoes'}>
        <AdminSettings />
      </Show>

      <DialogHost />
    </div>
  );
}
