import { createSignal, Show, onMount, onCleanup } from 'solid-js';
import type { Product, Settings } from '~/types/shared';
import AdminReservations from './AdminReservations';
import AdminSettings from './AdminSettings';
import AdminProducts from './AdminProducts';
import DialogHost, { confirmDialog, toast } from './DialogHost';
import { authFetch, currentUser, isLoggedIn, logout } from '~/lib/auth';
import { hasPendingChanges, pendingCount, describePending, publishAll, discardAll, getPristineSettings, loadPristineSettings } from './draftStore';

interface Props {
  products: Product[];
}

type Tab = 'reservas' | 'produtos' | 'configuracoes';

export default function AdminPanel(props: Props) {
  const [tab, setTab] = createSignal<Tab>('reservas');
  const [userEmail, setUserEmail] = createSignal('');
  const [publishing, setPublishing] = createSignal(false);

  onMount(() => {
    const u = currentUser();
    if (u) setUserEmail(u.email);

    // Pré-carrega settings em background pra qualquer tab ter acesso
    // a rooms/datas/etc. AdminSettings também carrega; primeiro a
    // chegar ganha (loadPristineSettings só sobrescreve se ainda não
    // tem nada).
    if (isLoggedIn() && !getPristineSettings()) {
      authFetch('/api/admin/settings')
        .then((res) => res.ok ? res.json() : null)
        .then((body: { data?: { settings: Settings } } | null) => {
          if (body?.data?.settings && !getPristineSettings()) {
            loadPristineSettings(body.data.settings);
          }
        })
        .catch(() => {/* silencioso — AdminSettings tenta de novo */});
    }

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (hasPendingChanges()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);
    onCleanup(() => window.removeEventListener('beforeunload', beforeUnload));
  });

  async function handleLogout() {
    if (hasPendingChanges()) {
      const ok = await confirmDialog({
        title: 'Sair sem publicar?',
        body: 'Você tem alterações no rascunho que serão perdidas se sair agora.',
        ok: 'Sair mesmo assim',
        cancel: 'Voltar',
        danger: true,
      });
      if (!ok) return;
    }
    logout();
    window.location.reload();
  }

  async function handlePublish() {
    if (!hasPendingChanges() || publishing()) return;
    setPublishing(true);
    try {
      const result = await publishAll();
      if (result.ok) {
        toast('Tudo publicado ✓ — alterações no ar em até 30s', 'ok', 4000);
      } else if (result.errors.length > 0) {
        toast(`Publicação parcial — ${result.errors.length} erro(s). Veja console.`, 'err', 6000);
        console.error('Publish errors:', result.errors);
      }
    } finally {
      setPublishing(false);
    }
  }

  async function handleDiscard() {
    if (!hasPendingChanges()) return;
    const ok = await confirmDialog({
      title: 'Descartar todas as alterações?',
      body: `Vai jogar fora ${pendingCount()} alteração(ões) do rascunho. Tem certeza?`,
      ok: 'Descartar tudo',
      cancel: 'Voltar',
      danger: true,
    });
    if (!ok) return;
    discardAll();
    toast('Alterações descartadas', 'ok');
  }

  function pendingSummary(): string {
    const parts = describePending();
    if (parts.length === 0) return 'Tudo salvo';
    return parts.map((p) => p.label).join(' · ');
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

        <Show when={hasPendingChanges()}>
          <div class="bg-warn-s border-t border-warn/30">
            <div class="max-w-7xl mx-auto px-5 lg:px-8 py-2.5 flex flex-col lg:flex-row lg:items-center gap-2.5">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="w-2 h-2 rounded-full bg-warn animate-pulse shrink-0" />
                <div class="min-w-0">
                  <div class="text-xs font-bold text-ink leading-tight">
                    {pendingCount()} alteração{pendingCount() === 1 ? '' : 'ões'} no rascunho
                  </div>
                  <div class="text-[11px] text-ink-soft truncate">{pendingSummary()}</div>
                </div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={publishing()}
                  class="h-9 px-3.5 rounded-lg bg-white hover:bg-line border border-line text-xs font-semibold text-ink-soft hover:text-ink transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  Descartar
                </button>
                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing()}
                  class="h-9 px-4 rounded-lg bg-primary hover:bg-primary-h text-xs font-semibold text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-pop"
                >
                  <Show
                    when={!publishing()}
                    fallback={<div class="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  </Show>
                  {publishing() ? 'Publicando…' : 'Publicar alterações'}
                </button>
              </div>
            </div>
          </div>
        </Show>
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
