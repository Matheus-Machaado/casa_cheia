import { createSignal, onMount, Show, For } from 'solid-js';
import type { Settings } from '~/types/shared';

interface ApiResponse {
  data?: {
    settings?: Settings;
    whatsapp_health?: { configured: boolean; missing: string[] };
  } | Settings;
  error?: { message: string };
}

const PLACEHOLDER_DOCS: Array<{ key: string; example: string }> = [
  { key: '{nome}', example: 'Primeiro nome do convidado (ex: Ana)' },
  { key: '{nome_completo}', example: 'Nome completo (ex: Ana Silva)' },
  { key: '{produto}', example: 'Título do produto reservado' },
  { key: '{qty}', example: 'Quantidade reservada' },
  { key: '{data}', example: 'Data formatada (ex: 15 de abril, 2026)' },
  { key: '{hora}', example: 'Horário do chá (ex: 14:00)' },
  { key: '{endereco}', example: 'Endereço do chá' },
  { key: '{quando}', example: 'Texto relativo (ex: amanhã, daqui 6h)' },
  { key: '{bride}', example: 'Nome da Lina' },
];

export default function AdminSettings() {
  const [settings, setSettings] = createSignal<Settings | null>(null);
  const [waHealth, setWaHealth] = createSignal<{ configured: boolean; missing: string[] } | null>(null);
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
      const body = (await res.json()) as ApiResponse;
      if (!res.ok || !body.data) {
        setError(body.error?.message ?? 'Erro ao carregar');
        return;
      }
      const data = body.data as { settings: Settings; whatsapp_health: { configured: boolean; missing: string[] } };
      setSettings(data.settings);
      setWaHealth(data.whatsapp_health);
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

  async function resetThankYou() {
    if (!confirm('Resetar a flag de agradecimento? Próxima reserva pode disparar broadcast de novo.')) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings?action=reset-thankyou', {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: { message: string } };
        setError(body.error?.message ?? 'Erro ao resetar');
        return;
      }
      await load();
      setSuccess('Flag de agradecimento resetada ✓');
      setTimeout(() => setSuccess(null), 3000);
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
        <div class="bg-success-s text-success text-sm rounded-lg px-4 py-3">{success()}</div>
      </Show>

      <Show when={settings()}>
        {(s) => (
          <>
            {/* Master switch WhatsApp */}
            <section class="bg-white border border-line rounded-2xl p-5 lg:p-6">
              <div class="flex items-start justify-between gap-4 mb-2">
                <div>
                  <h2 class="text-lg font-bold text-ink tracking-tight">Disparos por WhatsApp</h2>
                  <p class="text-sm text-ink-soft mt-0.5">Lembretes e agradecimentos vão pelo WhatsApp dos convidados.</p>
                </div>
                <button
                  type="button"
                  disabled={saving()}
                  onClick={() => save({ whatsapp_enabled: !s().whatsapp_enabled })}
                  class={`shrink-0 h-7 w-12 rounded-full transition relative ${s().whatsapp_enabled ? 'bg-primary' : 'bg-line'} disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed`}
                  aria-label="Toggle WhatsApp"
                >
                  <span class={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition shadow-sm ${s().whatsapp_enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <Show when={waHealth() && !waHealth()!.configured}>
                <div class="mt-3 bg-warning-s text-warning text-xs rounded-lg px-3 py-2 leading-relaxed">
                  ⚠ Evolution API não está configurada. Faltam env vars: <code class="font-mono">{waHealth()!.missing.join(', ')}</code>. Sem isso, os disparos ficam silenciosos (sem erro pro convidado, mas nada é enviado).
                </div>
              </Show>
              <Show when={waHealth() && waHealth()!.configured}>
                <div class="mt-3 bg-success-s text-success text-xs rounded-lg px-3 py-2">
                  ✓ Evolution API configurada
                </div>
              </Show>
            </section>

            {/* Reminder */}
            <section class="bg-white border border-line rounded-2xl p-5 lg:p-6">
              <div class="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 class="text-lg font-bold text-ink tracking-tight">Lembrete antes do chá</h2>
                  <p class="text-sm text-ink-soft mt-0.5">Dispara automaticamente pra todos os convidados que reservaram.</p>
                </div>
                <button
                  type="button"
                  disabled={saving()}
                  onClick={() => save({ reminder_enabled: !s().reminder_enabled })}
                  class={`shrink-0 h-7 w-12 rounded-full transition relative ${s().reminder_enabled ? 'bg-primary' : 'bg-line'} disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed`}
                  aria-label="Toggle reminder"
                >
                  <span class={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition shadow-sm ${s().reminder_enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div class="mb-4">
                <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Quantas horas antes do chá</label>
                <div class="flex items-center gap-3">
                  <input
                    type="number"
                    min={1}
                    max={720}
                    value={s().reminder_hours_before}
                    onInput={(e) => update('reminder_hours_before', Number(e.currentTarget.value))}
                    onBlur={() => save({ reminder_hours_before: s().reminder_hours_before })}
                    class="w-24 h-11 px-3 bg-line-2 border-0 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                  />
                  <span class="text-sm text-ink-soft">horas antes ({(s().reminder_hours_before / 24).toFixed(1)} dias)</span>
                </div>
              </div>

              <div>
                <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Mensagem do lembrete</label>
                <textarea
                  rows={8}
                  value={s().reminder_message_template}
                  onInput={(e) => update('reminder_message_template', e.currentTarget.value)}
                  onBlur={() => save({ reminder_message_template: s().reminder_message_template })}
                  class="w-full px-4 py-3 bg-line-2 border-0 rounded-xl text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition resize-none"
                />
                <p class="text-[11px] text-ink-3 mt-1.5">Salva automaticamente quando você sai do campo.</p>
              </div>
            </section>

            {/* Thank you */}
            <section class="bg-white border border-line rounded-2xl p-5 lg:p-6">
              <div class="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h2 class="text-lg font-bold text-ink tracking-tight">Agradecimento ao completar a lista</h2>
                  <p class="text-sm text-ink-soft mt-0.5">Dispara automaticamente quando 100% dos presentes forem reservados.</p>
                </div>
                <button
                  type="button"
                  disabled={saving()}
                  onClick={() => save({ thankyou_enabled: !s().thankyou_enabled })}
                  class={`shrink-0 h-7 w-12 rounded-full transition relative ${s().thankyou_enabled ? 'bg-primary' : 'bg-line'} disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed`}
                  aria-label="Toggle thankyou"
                >
                  <span class={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white transition shadow-sm ${s().thankyou_enabled ? 'translate-x-5' : ''}`} />
                </button>
              </div>

              <div>
                <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Mensagem de agradecimento</label>
                <textarea
                  rows={8}
                  value={s().thankyou_message_template}
                  onInput={(e) => update('thankyou_message_template', e.currentTarget.value)}
                  onBlur={() => save({ thankyou_message_template: s().thankyou_message_template })}
                  class="w-full px-4 py-3 bg-line-2 border-0 rounded-xl text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition resize-none"
                />
                <p class="text-[11px] text-ink-3 mt-1.5">Salva automaticamente quando você sai do campo.</p>
              </div>

              <Show when={s().thankyou_sent}>
                <div class="mt-4 p-3 bg-line-2 rounded-xl flex items-start justify-between gap-3">
                  <div class="text-xs text-ink-soft">
                    <strong class="text-ink">Já foi disparado</strong> em {s().thankyou_sent_at ? new Date(s().thankyou_sent_at!).toLocaleString('pt-BR') : '—'}.
                    <br />
                    Se quer disparar de novo (pra teste), reseta a flag abaixo.
                  </div>
                  <button
                    type="button"
                    onClick={resetThankYou}
                    disabled={saving()}
                    class="shrink-0 h-9 px-3 rounded-lg bg-white border border-line hover:bg-line-2 text-xs font-semibold text-ink-soft transition"
                  >
                    Resetar flag
                  </button>
                </div>
              </Show>
            </section>

            {/* Placeholders reference */}
            <section class="bg-white border border-line rounded-2xl p-5 lg:p-6">
              <h2 class="text-lg font-bold text-ink tracking-tight mb-3">Placeholders disponíveis</h2>
              <p class="text-sm text-ink-soft mb-4">Use nas mensagens — são substituídos no momento do disparo.</p>
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
