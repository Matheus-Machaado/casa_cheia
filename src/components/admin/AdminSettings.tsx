import { onMount, Show, For } from 'solid-js';
import type { Settings } from '~/types/shared';
import { authFetch, isLoggedIn } from '~/lib/auth';
import { applyCEPMask, parseCEPDigits, CEP_INPUT_MAX_LENGTH } from '~/lib/masks';
import { toast } from './DialogHost';
import { draftSettings, loadPristineSettings, updateSettingsPatch, patchSettingsBulk, getPristineSettings } from './draftStore';

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

async function fetchCEP(cep: string): Promise<ViaCepResponse | null> {
  const digits = parseCEPDigits(cep);
  if (digits.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
    if (!res.ok) return null;
    const data = await res.json() as ViaCepResponse;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

const PLACEHOLDER_DOCS: Array<{ key: string; example: string }> = [
  { key: '{nome}', example: 'Primeiro nome do convidado (ex: Ana)' },
  { key: '{nome_completo}', example: 'Nome completo (ex: Ana Silva)' },
  { key: '{produto}', example: 'Título do produto reservado' },
  { key: '{qty}', example: 'Quantidade reservada' },
  { key: '{data}', example: 'Data formatada (ex: 15 de abril, 2026)' },
  { key: '{hora}', example: 'Horário do chá (ex: 14:00)' },
  { key: '{endereco}', example: 'Endereço do chá' },
  { key: '{bride}', example: 'Nome da homenageada' },
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
  async function load() {
    if (!isLoggedIn()) return;
    if (getPristineSettings()) return; // já carregado
    try {
      const res = await authFetch('/api/admin/settings');
      const body = await res.json() as { data?: { settings: Settings }; error?: { message: string } };
      if (res.ok && body.data) {
        loadPristineSettings(body.data.settings);
      } else {
        toast(body.error?.message ?? 'Erro ao carregar configurações', 'err');
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (msg !== 'session-expired') toast(msg, 'err');
    }
  }

  onMount(load);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) {
    updateSettingsPatch(key, value);
  }

  return (
    <div class="max-w-3xl mx-auto px-5 lg:px-8 py-5 lg:py-7 space-y-6">
      <Show when={!draftSettings()}>
        <div class="text-center py-10 text-ink-3 text-sm">Carregando…</div>
      </Show>

      <Show when={draftSettings()}>
        {(s) => (
          <>
            <section class="bg-white border border-line rounded-2xl p-5 lg:p-6">
              <h2 class="text-lg font-bold text-ink tracking-tight">Dados do chá</h2>
              <p class="text-sm text-ink-soft mt-0.5 mb-4">Aparecem na home, nas mensagens e no convite. Clique em <strong>Publicar</strong> no topo pra subir as mudanças.</p>

              <div class="space-y-4">
                <div>
                  <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Nome da homenageada</label>
                  <input
                    type="text"
                    maxLength={80}
                    value={s().bride_name}
                    onInput={(e) => update('bride_name', e.currentTarget.value)}
                    class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
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
                        if (v) update('event_date', v);
                      }}
                      class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                    />
                  </div>
                  <div>
                    <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Horário</label>
                    <input
                      type="time"
                      value={s().event_time}
                      onChange={(e) => {
                        const v = e.currentTarget.value;
                        if (v) update('event_time', v);
                      }}
                      class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                    />
                  </div>
                </div>

                <div class="space-y-3 p-3 rounded-xl bg-line-2/50 border border-line">
                  <div class="text-[11px] uppercase tracking-wider text-ink-3 font-bold">Endereço</div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">CEP</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={CEP_INPUT_MAX_LENGTH}
                        value={applyCEPMask(s().event_cep)}
                        placeholder="12345-678"
                        onInput={(e) => {
                          const masked = applyCEPMask(e.currentTarget.value);
                          e.currentTarget.value = masked;
                          const digits = parseCEPDigits(masked);
                          update('event_cep', digits);
                        }}
                        onBlur={async (e) => {
                          const digits = parseCEPDigits(e.currentTarget.value);
                          if (digits.length === 8 && digits !== s().event_cep) {
                            update('event_cep', digits);
                          }
                          if (digits.length === 8) {
                            const found = await fetchCEP(digits);
                            if (found) {
                              patchSettingsBulk({
                                event_cep: digits,
                                event_street: found.logradouro || s().event_street,
                                event_neighborhood: found.bairro || s().event_neighborhood,
                                event_city: found.localidade || s().event_city,
                                event_state: (found.uf || s().event_state).toUpperCase(),
                              });
                              toast('Endereço preenchido pelo CEP', 'ok', 2000);
                            } else {
                              toast('CEP não encontrado — preenche o resto manualmente', 'warn', 3000);
                            }
                          }
                        }}
                        class="w-full h-11 px-3.5 bg-white border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                      <p class="text-[10px] text-ink-3 mt-1">Digita o CEP e os campos preenchem sozinhos.</p>
                    </div>
                    <div>
                      <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">Rua / Avenida</label>
                      <input
                        type="text"
                        maxLength={120}
                        value={s().event_street}
                        onInput={(e) => update('event_street', e.currentTarget.value)}
                        placeholder="Av. Brasil"
                        class="w-full h-11 px-3.5 bg-white border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                    </div>
                  </div>

                  <div class="grid grid-cols-2 gap-3">
                    <div>
                      <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">Número</label>
                      <input
                        type="text"
                        maxLength={20}
                        value={s().event_number}
                        onInput={(e) => update('event_number', e.currentTarget.value)}
                        placeholder="123"
                        class="w-full h-11 px-3.5 bg-white border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                    </div>
                    <div>
                      <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">Complemento</label>
                      <input
                        type="text"
                        maxLength={80}
                        value={s().event_complement}
                        onInput={(e) => update('event_complement', e.currentTarget.value)}
                        placeholder="apto 42 / bloco B"
                        class="w-full h-11 px-3.5 bg-white border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">Bairro</label>
                    <input
                      type="text"
                      maxLength={80}
                      value={s().event_neighborhood}
                      onInput={(e) => update('event_neighborhood', e.currentTarget.value)}
                      placeholder="Centro"
                      class="w-full h-11 px-3.5 bg-white border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
                    />
                  </div>

                  <div class="grid grid-cols-[1fr_auto] gap-3">
                    <div>
                      <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">Cidade</label>
                      <input
                        type="text"
                        maxLength={80}
                        value={s().event_city}
                        onInput={(e) => update('event_city', e.currentTarget.value)}
                        placeholder="São Paulo"
                        class="w-full h-11 px-3.5 bg-white border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                    </div>
                    <div>
                      <label class="block text-[10px] uppercase tracking-wider text-ink-3 font-semibold mb-1.5">UF</label>
                      <input
                        type="text"
                        maxLength={2}
                        value={s().event_state}
                        onInput={(e) => update('event_state', e.currentTarget.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2))}
                        placeholder="SP"
                        class="w-20 h-11 px-3.5 bg-white border-0 rounded-xl text-sm font-bold text-center uppercase focus:outline-none focus:ring-2 focus:ring-primary transition"
                      />
                    </div>
                  </div>

                  <Show when={s().event_address}>
                    <div class="text-[11px] text-ink-3 pt-1 border-t border-line">
                      <span class="font-semibold">Endereço completo:</span> {s().event_address}
                    </div>
                  </Show>
                </div>

                <div>
                  <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Título da capa</label>
                  <input
                    type="text"
                    maxLength={120}
                    value={s().splash_title}
                    onInput={(e) => update('splash_title', e.currentTarget.value)}
                    placeholder="Ajude a Lina a deixar o apê cheinho."
                    class="w-full h-11 px-3.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition"
                  />
                </div>

                <div>
                  <label class="block text-[11px] uppercase tracking-wider text-ink-3 font-bold mb-1.5">Subtítulo da capa</label>
                  <textarea
                    rows={2}
                    maxLength={240}
                    value={s().splash_subtitle}
                    onInput={(e) => update('splash_subtitle', e.currentTarget.value)}
                    placeholder="Escolhe um presentinho lá embaixo. A cada item, a casa fica mais cheia — e a Lina mais feliz."
                    class="w-full px-3.5 py-2.5 bg-line-2 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition resize-none"
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
                    class="w-full px-4 py-3 bg-line-2 border-0 rounded-xl text-[14px] font-mono focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white transition resize-none"
                  />
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
