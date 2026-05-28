import { createSignal, onMount, Show, For } from 'solid-js';
import type { Settings } from '~/types/shared';

const PLACEHOLDER_DOCS: Array<{ key: string; example: string }> = [
  { key: '{nome}', example: 'Primeiro nome do convidado (ex: Ana)' },
  { key: '{nome_completo}', example: 'Nome completo (ex: Ana Silva)' },
  { key: '{produto}', example: 'Título do produto reservado' },
  { key: '{qty}', example: 'Quantidade reservada' },
  { key: '{data}', example: 'Data formatada (ex: 15 de abril, 2026)' },
  { key: '{hora}', example: 'Horário do chá (ex: 14:00)' },
  { key: '{endereco}', example: 'Endereço do chá' },
  { key: '{bride}', example: 'Nome da Lina' },
];

const SECTIONS: Array<{ key: keyof Settings; title: string; subtitle: string; rows: number }> = [
  {
    key: 'reminder_message_template',
    title: 'Lembrete antes do chá',
    subtitle: 'Mensagem que dispara via botão "Lembrar" por convidado ou bulk "Lembrar todos".',
    rows: 8,
  },
  {
    key: 'thankyou_complete_message_template',
    title: 'Agradecimento quando a lista fica completa',
    subtitle: 'Antes do chá. Use pra convidar pra comemorar — botão habilita ao bater 100%.',
    rows: 8,
  },
  {
    key: 'thankyou_post_message_template',
    title: 'Agradecimento depois do chá',
    subtitle: 'Mesmo que a lista não tenha completado. Use pra agradecer participação após o evento.',
    rows: 8,
  },
];

export default function AdminSettings() {
  const [settings, setSettings] = createSignal<Settings | null>(null);
  const [loading, setLoading] = createSignal(true);
  const [saving, setSaving] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  const [success, setSuccess] = createSignal<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings', { credentials: 'include' });
      if (res.status === 401) {
        setError('Sessão expirou. Recarrega a página e faz login de novo.');
        return;
      }
      const body = (await res.json()) as { data?: { settings: Settings }; error?: { message: string } };
      if (!res.ok || !body.data) {
        setError(body.error?.message ?? 'Erro ao carregar');
        return;
      }
      setSettings(body.data.settings);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  onMount(load);

  async function save(patch: Partial<Settings>) {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patch),
      });
      const body = (await res.json()) as { data?: Settings; error?: { message: string } };
      if (!res.ok || !body.data) {
        setError(body.error?.message ?? 'Erro ao salvar');
        return;
      }
      setSettings(body.data);
      setSuccess('Salvo ✓');
      setTimeout(() => setSuccess(null), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    const s = settings();
    if (!s) return;
    setSettings({ ...s, [key]: value });
  }

  return (
    <div class="max-w-3xl mx-auto px-5 lg:px-8 py-5 lg:py-7 space-y-6">
      <Show when={loading()}>
        <div class="text-center py-10 text-ink-3 text-sm">Carregando…</div>
      </Show>

      <Show when={error()}>
        <div class="bg-danger-s text-danger text-sm rounded-lg px-4 py-3">{error()}</div>
      </Show>

      <Show when={success()}>
        <div class="bg-success-s text-success text-sm rounded-lg px-4 py-3 sticky top-4">{success()}</div>
      </Show>

      <Show when={settings()}>
        {(s) => (
          <>
            <div class="bg-white border border-line rounded-2xl p-5 lg:p-6">
              <h2 class="text-lg font-bold text-ink tracking-tight mb-1">Templates das mensagens</h2>
              <p class="text-sm text-ink-soft">Você dispara cada uma manualmente — a plataforma só monta a mensagem prontinha com o nome do convidado e abre o WhatsApp pra você dar enviar.</p>
            </div>

            <For each={SECTIONS}>
              {(sec) => (
                <section class="bg-white border border-line rounded-2xl p-5 lg:p-6">
                  <h2 class="text-lg font-bold text-ink tracking-tight">{sec.title}</h2>
                  <p class="text-sm text-ink-soft mt-0.5 mb-4">{sec.subtitle}</p>
                  <textarea
                    rows={sec.rows}
                    value={s()[sec.key] as string}
                    onInput={(e) => update(sec.key, e.currentTarget.value as never)}
                    onBlur={() => save({ [sec.key]: s()[sec.key] } as Partial<Settings>)}
                    disabled={saving()}
                    class="w-full px-4 py-3 bg-line-2 border-0 rounded-xl text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition resize-none disabled:opacity-60"
                  />
                  <p class="text-[11px] text-ink-3 mt-1.5">Salva quando você sai do campo.</p>
                </section>
              )}
            </For>

            <section class="bg-white border border-line rounded-2xl p-5 lg:p-6">
              <h2 class="text-lg font-bold text-ink tracking-tight mb-3">Placeholders disponíveis</h2>
              <p class="text-sm text-ink-soft mb-4">Use nas mensagens — são substituídos no momento que você gera o link.</p>
              <div class="grid sm:grid-cols-2 gap-2">
                <For each={PLACEHOLDER_DOCS}>
                  {(p) => (
                    <div class="flex items-start gap-2 p-2.5 bg-line-2 rounded-lg">
                      <code class="font-mono text-xs text-primary font-bold shrink-0">{p.key}</code>
                      <span class="text-xs text-ink-soft leading-relaxed">{p.example}</span>
                    </div>
                  )}
                </For>
              </div>
            </section>
          </>
        )}
      </Show>
    </div>
  );
}
