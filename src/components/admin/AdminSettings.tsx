import { createSignal, onMount, Show, For } from 'solid-js';
import type { Settings } from '~/types/shared';
import { authFetch, isLoggedIn } from '~/lib/auth';

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
    if (!isLoggedIn()) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await authFetch('/api/admin/settings');
      const body = (await res.json()) as { data?: { settings: Settings }; error?: { message: string } };
      if (!res.ok || !body.data) {
        setError(body.error?.message ?? 'Erro ao carregar');
        return;
      }
      setSettings(body.data.settings);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== 'session-expired') setError(msg);
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
      const res = await authFetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
            <section class="bg-white border border-line rounded-2xl p-5 lg:p-6">
              <h2 class="text-lg font-bold text-ink tracking-tight">Dados do chá</h2>
              <p class="text-sm text-ink-soft mt-0.5 mb-4">Aparecem na home, nas mensagens e no convite. Atualizam o site em até 30s depois do save.</p>

              <div class="space-y-4">
                <div>
                  <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Nome da homenageada</label>
                  <input
                    type="text"
                    maxLength={80}
                    value={s().bride_name}
                    onInput={(e) => update('bride_name', e.currentTarget.value)}
                    onBlur={() => save({ bride_name: s().bride_name })}
                    disabled={saving()}
                    class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition disabled:opacity-60"
                  />
                </div>

                <div class="grid grid-cols-2 gap-3">
                  <div>
                    <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Data</label>
                    <input
                      type="date"
                      value={s().event_date}
                      onChange={(e) => {
                        const v = e.currentTarget.value;
                        if (v) save({ event_date: v });
                      }}
                      disabled={saving()}
                      class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Horário</label>
                    <input
                      type="time"
                      value={s().event_time}
                      onChange={(e) => {
                        const v = e.currentTarget.value;
                        if (v) save({ event_time: v });
                      }}
                      disabled={saving()}
                      class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition disabled:opacity-60"
                    />
                  </div>
                </div>

                <div>
                  <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Endereço</label>
                  <input
                    type="text"
                    maxLength={200}
                    value={s().event_address}
                    onInput={(e) => update('event_address', e.currentTarget.value)}
                    onBlur={() => save({ event_address: s().event_address })}
                    disabled={saving()}
                    placeholder="Av. Tal, 123 — apto 42, Cidade/UF"
                    class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition disabled:opacity-60"
                  />
                </div>

                <div>
                  <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Título da capa</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={s().splash_title}
                    onInput={(e) => update('splash_title', e.currentTarget.value)}
                    onBlur={() => save({ splash_title: s().splash_title })}
                    disabled={saving()}
                    placeholder="Ajude a Lina a deixar o apê cheinho."
                    class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition disabled:opacity-60"
                  />
                </div>

                <div>
                  <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Subtítulo da capa</label>
                  <textarea
                    rows={2}
                    maxLength={240}
                    value={s().splash_subtitle}
                    onInput={(e) => update('splash_subtitle', e.currentTarget.value)}
                    onBlur={() => save({ splash_subtitle: s().splash_subtitle })}
                    disabled={saving()}
                    placeholder="Escolhe um presentinho lá embaixo. A cada item, a casa fica mais cheia — e a Lina mais feliz."
                    class="w-full px-3.5 py-2.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition disabled:opacity-60 resize-none"
                  />
                </div>
              </div>
            </section>

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
