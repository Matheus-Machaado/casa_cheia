/**
 * Casa Cheia — Pipeline de geração de assets de animação
 *
 * Gera:
 *  - 5 imagens-base da Lina + apê em buckets de expressão (0/25/50/75/100%)
 *  - ~12 overlays PNG transparentes (produtos posicionados no apê)
 *
 * Modelo: Google Gemini 2.5 Flash Image (codename "nano-banana")
 * Custo estimado: ~$0.04/img × 17 = ~$0.70 total
 *
 * Pré-requisitos:
 *  1. GEMINI_API_KEY em `.studio/local/casacheia-secrets.env` (gitignored)
 *  2. inputs/lina-apt-empty.jpg (obrigatório)
 *  3. inputs/lina-smile.jpg (opcional, melhora fidelidade)
 *
 * Uso:
 *   npm run generate-assets              # tudo
 *   npm run generate-base                # só as 5 bases
 *   npm run generate-overlay             # só overlays
 *   npm run generate-assets -- --only base-50  # só uma base específica
 *
 * Output:
 *   public/animation/bases/base-{00,25,50,75,100}.webp
 *   public/animation/overlays/overlay-<id>.png
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

// ─── Setup ──────────────────────────────────────────────────────

const SECRETS_PATH = path.resolve(process.cwd(), '../../.studio/local/casacheia-secrets.env');
dotenv.config({ path: SECRETS_PATH });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error(`❌ GEMINI_API_KEY não encontrada em ${SECRETS_PATH}`);
  console.error('   Crie o arquivo com: GEMINI_API_KEY=AIza...');
  process.exit(1);
}

const genAI = new GoogleGenAI({ apiKey });
const MODEL = 'gemini-2.5-flash-image';

const PROJECT_ROOT = path.resolve(process.cwd());
const INPUTS_DIR = path.join(PROJECT_ROOT, 'inputs');
const OUTPUT_BASES = path.join(PROJECT_ROOT, 'public/animation/bases');
const OUTPUT_OVERLAYS = path.join(PROJECT_ROOT, 'public/animation/overlays');

// ─── Helpers ────────────────────────────────────────────────────

async function fileToInlineData(filepath: string) {
  const buf = await fs.readFile(filepath);
  const ext = path.extname(filepath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png'
    : ext === '.webp' ? 'image/webp'
    : 'image/jpeg';
  return {
    inlineData: {
      data: buf.toString('base64'),
      mimeType,
    },
  };
}

async function generateImage(parts: any[], outputPath: string) {
  console.log(`→ Gerando ${path.basename(outputPath)}...`);
  const response = await genAI.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts }],
  });

  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) {
    throw new Error('Resposta sem parts da Gemini');
  }

  for (const part of candidate.content.parts) {
    if (part.inlineData?.data) {
      const buf = Buffer.from(part.inlineData.data, 'base64');
      await fs.writeFile(outputPath, buf);
      console.log(`  ✓ ${path.basename(outputPath)} (${(buf.length / 1024).toFixed(0)}kb)`);
      return;
    }
  }
  throw new Error('Resposta da Gemini não contém imagem');
}

// ─── Bases (5 expressões) ───────────────────────────────────────

const BASE_BUCKETS = [
  {
    pct: 0,
    file: 'base-00.webp',
    expression: `quietly disheartened — slight mouth downturn, eyes looking slightly down (soft and tired, not crying), shoulders slightly slouched, one hand resting on hip, body language reads "I have no idea where to start"`,
  },
  {
    pct: 25,
    file: 'base-25.webp',
    expression: `softly hopeful — gentle closed-lip smile (corners slightly up), eyes looking forward, posture upright and centered, hands relaxed at sides, body language reads "starting to feel possible"`,
  },
  {
    pct: 50,
    file: 'base-50.webp',
    expression: `warm content smile — closed warm smile, eyes engaged and looking at viewer, hand resting at side of helmet, slight body angle to one side, body language reads "loving how this is shaping up"`,
  },
  {
    pct: 75,
    file: 'base-75.webp',
    expression: `genuinely happy — open smile showing teeth (genuine, not forced), eyes slightly crinkled at corners, posture animated with one arm gesturing slightly, lively body language, body language reads "almost there, this is amazing"`,
  },
  {
    pct: 100,
    file: 'base-100.webp',
    expression: `radiant celebrating — full laugh-smile (cheek raise, joyful), bright eyes or slight closed-eye smile, arms slightly out in subtle celebration, jubilant body language, body language reads "we did it! casa cheia!"`,
  },
];

function basePrompt(expression: string) {
  return `Edit this photo of Lina in her empty apartment. Keep EXACTLY the same: composition, camera angle, lighting (warm morning natural light from window), outfit (yellow short-sleeve top, light blue cargo jeans, white sneakers, white construction safety helmet "VISITANTE"), apartment background (white walls, polished concrete floor, large window with curtains/blinds), her face and hair identity. The apartment must remain EMPTY (no furniture, no items, no decor).

CHANGE ONLY her facial expression and body posture:
${expression}

Output as a high-quality photograph, photorealistic, matching the input style precisely. Same resolution and aspect ratio. Do not add captions, watermarks, or text.`;
}

// ─── Overlays (produtos no apê, fundo transparente) ─────────────

const OVERLAYS = [
  {
    id: 'panelas-stove',
    file: 'overlay-panelas-stove.png',
    description: 'a complete 8-piece beige/cream ceramic Brinox pot and pan set arranged on the kitchen counter / stovetop area',
    position: 'middle-right of the room, on a kitchen counter area, resting at floor level if no counter is visible',
  },
  {
    id: 'eletros-bancada',
    file: 'overlay-eletros-bancada.png',
    description: 'a modern silver air fryer and a stainless coffee maker placed side by side on a kitchen counter',
    position: 'right side of the room, kitchen area',
  },
  {
    id: 'liquidificador',
    file: 'overlay-liquidificador.png',
    description: 'a black 3L Philco blender with red base on a counter',
    position: 'right side of the room, kitchen area',
  },
  {
    id: 'cama-quarto',
    file: 'overlay-cama-quarto.png',
    description: 'a queen-size bed made up neatly with a rose/blush quilted bedspread (Camesa Edredom Rosé) and matching pillows',
    position: 'back-left of the room, against the wall',
  },
  {
    id: 'sofa-sala',
    file: 'overlay-sofa-sala.png',
    description: 'a modern dark grey 3-seat sofa with cushions',
    position: 'left side of the room, living area',
  },
  {
    id: 'mesa-jantar',
    file: 'overlay-mesa-jantar.png',
    description: 'a round white dining table set with a 16-piece Duralex white dinner set, glasses, and Tramontina stainless flatware for 4 people',
    position: 'center-left of the room',
  },
  {
    id: 'ventilador-torre',
    file: 'overlay-ventilador-torre.png',
    description: 'a tall black tower fan, 86cm height',
    position: 'far corner of the living area',
  },
  {
    id: 'aspirador',
    file: 'overlay-aspirador.png',
    description: 'a vertical cordless Electrolux Powerspeed vacuum cleaner standing upright',
    position: 'wall corner near a doorway',
  },
  {
    id: 'banheiro-set',
    file: 'overlay-banheiro-set.png',
    description: 'a modern bathroom set (4 pieces: soap dispenser, toothbrush holder, cotton holder, tray) with white ceramic and bamboo lids, plus a grey diatomite floor mat',
    position: 'small accent grouping on the floor',
  },
  {
    id: 'ferro-passar',
    file: 'overlay-ferro-passar.png',
    description: 'an Oster steam iron Aeroceramic resting on its base',
    position: 'on a small surface or accent area',
  },
  {
    id: 'potes-prateleira',
    file: 'overlay-potes-prateleira.png',
    description: 'a row of glass storage jars with bamboo lids (varying sizes from 400ml to 2L) arranged on an open shelf or counter',
    position: 'kitchen area, on a shelf or counter top',
  },
  {
    id: 'planta-decor',
    file: 'overlay-planta-decor.png',
    description: 'a tall green house plant (monstera or similar) in a simple black ceramic pot',
    position: 'corner of the living area',
  },
];

function overlayPrompt(o: typeof OVERLAYS[number]) {
  return `Using the reference photo of Lina's empty apartment as the spatial and lighting reference, create a new image showing ONLY the following item(s) as they would naturally appear in that exact apartment scene:

Item(s): ${o.description}
Position: ${o.position}

CRITICAL REQUIREMENTS:
- TRANSPARENT BACKGROUND (alpha channel, NO walls, NO floor, NO Lina, NO furniture other than the specified item)
- Match lighting from reference photo: warm morning natural light from window (soft shadows underneath each item, light falling from one side)
- Match perspective and scale from reference photo (items should look like they belong in that exact room)
- Photorealistic style, same color palette and grading as reference
- Items should rest naturally on a surface (with shadow at base) — not floating
- Output: PNG with alpha channel, same aspect ratio as reference
- NO captions, watermarks, text, or borders`;
}

// ─── Main ───────────────────────────────────────────────────────

async function loadInputs() {
  const linaApt = path.join(INPUTS_DIR, 'lina-apt-empty.jpg');
  try {
    await fs.access(linaApt);
  } catch {
    console.error(`❌ Foto base não encontrada: ${linaApt}`);
    console.error('   Coloque a foto da Lina no apê vazio em inputs/lina-apt-empty.jpg');
    process.exit(1);
  }
  const linaAptPart = await fileToInlineData(linaApt);

  // Selfies opcionais — se existir, anexa pra Gemini referenciar expressão real
  const optionalRefs: any[] = [];
  for (const f of ['lina-smile.jpg', 'lina-neutral.jpg']) {
    const p = path.join(INPUTS_DIR, f);
    try { await fs.access(p); optionalRefs.push(await fileToInlineData(p)); console.log(`  + referência: ${f}`); } catch {}
  }
  return { linaAptPart, optionalRefs };
}

async function generateBases(linaApt: any, refs: any[]) {
  console.log(`\n━━ BASES (5 expressões) ━━`);
  await fs.mkdir(OUTPUT_BASES, { recursive: true });
  for (const bucket of BASE_BUCKETS) {
    const out = path.join(OUTPUT_BASES, bucket.file);
    try {
      await generateImage([linaApt, ...refs, { text: basePrompt(bucket.expression) }], out);
    } catch (err) {
      console.error(`  ✗ ${bucket.file}: ${(err as Error).message}`);
    }
  }
}

async function generateOverlays(linaApt: any) {
  console.log(`\n━━ OVERLAYS (${OVERLAYS.length}) ━━`);
  await fs.mkdir(OUTPUT_OVERLAYS, { recursive: true });
  for (const o of OVERLAYS) {
    const out = path.join(OUTPUT_OVERLAYS, o.file);
    try {
      await generateImage([linaApt, { text: overlayPrompt(o) }], out);
    } catch (err) {
      console.error(`  ✗ ${o.file}: ${(err as Error).message}`);
    }
  }
}

const args = process.argv.slice(2);
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;
const isPilot = args.includes('--pilot');

async function generatePilot(linaApt: any, refs: any[]) {
  console.log(`\n━━ PILOTO (1 base + 1 overlay pra validação) ━━`);
  await fs.mkdir(OUTPUT_BASES, { recursive: true });
  await fs.mkdir(OUTPUT_OVERLAYS, { recursive: true });

  // 1 base — bucket 50 (contente, fácil de avaliar fidelidade do rosto)
  const bucket = BASE_BUCKETS.find(b => b.pct === 50)!;
  await generateImage(
    [linaApt, ...refs, { text: basePrompt(bucket.expression) }],
    path.join(OUTPUT_BASES, bucket.file)
  );

  // 1 overlay — panelas (item icônico)
  const overlay = OVERLAYS.find(o => o.id === 'panelas-stove')!;
  await generateImage(
    [linaApt, { text: overlayPrompt(overlay) }],
    path.join(OUTPUT_OVERLAYS, overlay.file)
  );
}

(async () => {
  console.log('🎨 Casa Cheia — Gerando assets de animação\n');
  const { linaAptPart, optionalRefs } = await loadInputs();

  if (isPilot) {
    await generatePilot(linaAptPart, optionalRefs);
  } else {
    if (only === 'bases' || only === null) await generateBases(linaAptPart, optionalRefs);
    if (only === 'overlays' || only === null) await generateOverlays(linaAptPart);
    if (only && only !== 'bases' && only !== 'overlays') {
      console.error(`❌ --only "${only}" inválido. Use: bases | overlays`);
      process.exit(1);
    }
  }

  console.log('\n✨ Pronto. Confira em public/animation/');
})().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
