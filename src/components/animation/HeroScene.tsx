import { createSignal, onMount } from 'solid-js';
import type { AvailabilitySnapshot } from '~/types/shared';

interface Props {
  brideName: string;
}

export default function HeroScene(props: Props) {
  const [pct, setPct] = createSignal(0);

  async function refresh() {
    try {
      const res = await fetch('/api/products/availability');
      if (!res.ok) return;
      const body = await res.json() as { data: AvailabilitySnapshot };
      setPct(body.data.total_progress_pct);
    } catch (e) {
      console.warn('availability refresh failed', e);
    }
  }

  onMount(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    const handler = () => refresh();
    window.addEventListener('casacheia:reservation-created', handler);
    return () => {
      clearInterval(interval);
      window.removeEventListener('casacheia:reservation-created', handler);
    };
  });

  const isFull = () => pct() >= 100;
  void props.brideName;

  return (
    <div class="relative w-full h-full overflow-hidden">
      {/* Base: apê em construção (sempre visível) */}
      <img
        src="/animation/before.png"
        alt="Apartamento da Lina"
        class="absolute inset-0 w-full h-full object-cover object-bottom"
        loading="eager"
      />

      {/* Estado final: apê cheio (só aparece em 100%) */}
      <img
        src="/animation/master.png"
        alt="Apartamento mobiliado"
        class="absolute inset-0 w-full h-full object-cover object-bottom transition-opacity duration-1000 select-none pointer-events-none"
        style={{ opacity: isFull() ? 1 : 0 }}
        aria-hidden={!isFull()}
        loading="eager"
      />

      {/* Pill bottom-left: % do apê */}
      <div class="absolute bottom-3 left-3 lg:bottom-4 lg:left-4 bg-white border border-line rounded-full px-3 py-1.5 shadow-xs flex items-center gap-2 z-20">
        <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span class="text-[11px] font-semibold text-ink">{pct()}% do apê</span>
      </div>

      {/* Medidômetro desktop */}
      <div class="hidden lg:flex absolute top-4 right-4 flex-col items-center gap-2 bg-white border border-line rounded-2xl px-2.5 py-3 shadow-sm z-20">
        <div class="text-[9px] uppercase tracking-[0.15em] text-ink-3 font-bold">Apê</div>
        <div class="w-6 h-44 bg-line-2 rounded-full overflow-hidden relative">
          <div
            class="absolute bottom-0 left-0 right-0 rounded-full bg-primary transition-all duration-700"
            style={{ height: `${pct()}%` }}
          />
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ink-soft" aria-hidden="true">
          <path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <div class="text-xs font-bold text-ink">{pct()}%</div>
      </div>

      {/* Medidômetro mobile */}
      <div class="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 bg-white border border-line rounded-full p-2 shadow-xs z-20">
        <div class="w-5 h-32 bg-line-2 rounded-full overflow-hidden relative">
          <div
            class="absolute bottom-0 left-0 right-0 rounded-full bg-primary transition-all duration-700"
            style={{ height: `${pct()}%` }}
          />
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ink-soft" aria-hidden="true">
          <path d="M3 9 12 2l9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
    </div>
  );
}
