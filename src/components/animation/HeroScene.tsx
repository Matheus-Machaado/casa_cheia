import { createSignal, For, onMount } from 'solid-js';
import type { AvailabilitySnapshot } from '~/types/shared';
import { bucketForPct } from '~/types/shared';

interface OverlayPosition {
  id: string;
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  width: string;
  z?: number;
}

// Posições calibradas pro hero scene (relativas ao container)
const OVERLAY_POSITIONS: OverlayPosition[] = [
  { id: 'panelas-stove',       bottom: '34%', right: '6%',  width: '20%', z: 3 },
  { id: 'eletros-bancada',     bottom: '36%', right: '28%', width: '18%', z: 2 },
  { id: 'liquidificador',      bottom: '36%', right: '48%', width: '12%', z: 2 },
  { id: 'cama-quarto',         top: '14%',    right: '14%', width: '22%', z: 1 },
  { id: 'sofa-sala',           bottom: '24%', left: '6%',   width: '28%', z: 2 },
  { id: 'mesa-jantar',         bottom: '20%', left: '36%',  width: '28%', z: 1 },
  { id: 'ventilador-torre',    bottom: '24%', left: '2%',   width: '8%',  z: 3 },
  { id: 'aspirador',           bottom: '24%', right: '2%',  width: '7%',  z: 3 },
  { id: 'banheiro-set',        bottom: '20%', right: '40%', width: '14%', z: 1 },
  { id: 'ferro-passar',        bottom: '32%', left: '32%',  width: '10%', z: 2 },
  { id: 'potes-prateleira',    top: '24%',    left: '12%',  width: '18%', z: 1 },
  { id: 'planta-decor',        bottom: '22%', right: '22%', width: '10%', z: 3 },
];

interface Props {
  brideName: string;
  initialPct?: number;
  initialOverlays?: string[];
}

export default function HeroScene(props: Props) {
  const [pct, setPct] = createSignal(props.initialPct ?? 0);
  const [activeOverlays, setActiveOverlays] = createSignal<Set<string>>(new Set(props.initialOverlays ?? []));
  const [bucket, setBucket] = createSignal(bucketForPct(props.initialPct ?? 0));

  async function refresh() {
    try {
      const res = await fetch('/api/products/availability');
      if (!res.ok) return;
      const body = await res.json() as { data: AvailabilitySnapshot };
      setPct(body.data.total_progress_pct);
      setBucket(bucketForPct(body.data.total_progress_pct));
      setActiveOverlays(new Set(body.data.overlays_active));
    } catch (e) {
      console.warn('availability refresh failed', e);
    }
  }

  onMount(() => {
    refresh();
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  });

  // Hot-update from same-page reservation form
  onMount(() => {
    const handler = () => refresh();
    window.addEventListener('casacheia:reservation-created', handler);
    return () => window.removeEventListener('casacheia:reservation-created', handler);
  });

  const moodIcon = () => {
    const p = pct();
    if (p >= 80) return 'M 5 12 Q 12 18, 19 12'; // big smile
    if (p >= 50) return 'M 5 13 Q 12 15, 19 13'; // smile
    if (p >= 25) return 'M 5 14 L 19 14'; // neutral
    return 'M 5 15 Q 12 11, 19 15'; // sad
  };

  return (
    <div class="relative w-full h-full">
      {/* 5 bases empilhadas, crossfade conforme bucket */}
      <For each={[0, 25, 50, 75, 100]}>
        {(b) => (
          <img
            src={`/animation/bases/base-${String(b).padStart(2, '0')}.webp`}
            alt={`Lina ${b}%`}
            class="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000"
            style={{ opacity: bucket() === b ? 1 : 0 }}
            loading={b === 0 ? 'eager' : 'lazy'}
          />
        )}
      </For>

      {/* Overlays */}
      <For each={OVERLAY_POSITIONS}>
        {(o) => (
          <div
            class="absolute transition-all duration-700"
            style={{
              top: o.top,
              bottom: o.bottom,
              left: o.left,
              right: o.right,
              width: o.width,
              'z-index': o.z ?? 1,
              opacity: activeOverlays().has(o.id) ? 1 : 0,
              transform: activeOverlays().has(o.id) ? 'scale(1) translateY(0)' : 'scale(0.7) translateY(20px)',
            }}
          >
            <img
              src={`/animation/overlays/overlay-${o.id}.png`}
              alt={o.id}
              class="w-full h-auto"
              loading="lazy"
            />
          </div>
        )}
      </For>

      {/* Mood pill bottom-left */}
      <div class="absolute bottom-3 left-3 lg:bottom-4 lg:left-4 bg-white border border-line rounded-full px-3 py-1.5 shadow-xs flex items-center gap-2 z-20">
        <span class="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
        <span class="text-[11px] font-semibold text-ink">{pct()}% completa</span>
      </div>

      {/* Medidômetro top-right desktop */}
      <div class="hidden lg:flex absolute top-4 right-4 flex-col items-center gap-2 bg-white border border-line rounded-2xl px-2.5 py-3 shadow-sm z-20">
        <div class="text-[9px] uppercase tracking-[0.15em] text-ink-3 font-bold">Felicidade</div>
        <div class="w-6 h-44 bg-line-2 rounded-full overflow-hidden relative">
          <div
            class="absolute bottom-0 left-0 right-0 rounded-full bg-primary transition-all duration-700"
            style={{ height: `${pct()}%` }}
          />
        </div>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ink-soft">
          <circle cx="12" cy="12" r="10" />
          <path d={moodIcon()} />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
        <div class="text-xs font-bold text-ink">{pct()}%</div>
      </div>

      {/* Medidômetro mobile lateral */}
      <div class="lg:hidden absolute right-3 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 bg-white border border-line rounded-full p-2 shadow-xs z-20">
        <div class="w-5 h-32 bg-line-2 rounded-full overflow-hidden relative">
          <div
            class="absolute bottom-0 left-0 right-0 rounded-full bg-primary transition-all duration-700"
            style={{ height: `${pct()}%` }}
          />
        </div>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-ink-soft">
          <circle cx="12" cy="12" r="10" />
          <path d={moodIcon()} />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
      </div>
    </div>
  );
}
