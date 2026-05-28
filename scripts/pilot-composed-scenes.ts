/**
 * Piloto: cenas compostas progressivas
 *
 * Testa se Gemini consegue ADICIONAR um item por vez na cena, INTEGRADO.
 * Cada gen usa a saída da anterior como input.
 *
 * Sequência:
 *   step-0 = base-00.webp (Lina apê vazio, já temos)
 *   step-1 = step-0 + panelas no chão/bancada
 *   step-2 = step-1 + sofá na sala
 *   step-3 = step-2 + cama no quarto
 *
 * Output: public/pilot/scene-{0,1,2,3}.webp
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs/promises';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../../.studio/local/casacheia-secrets.env') });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('❌ GEMINI_API_KEY não encontrada');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey });
const MODEL = 'gemini-2.5-flash-image';

const PROJECT_ROOT = path.resolve(process.cwd());
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'public', 'pilot');

async function fileToInlineData(filepath: string) {
  const buf = await fs.readFile(filepath);
  const ext = path.extname(filepath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return { inlineData: { data: buf.toString('base64'), mimeType } };
}

async function generate(inputPath: string, outputPath: string, prompt: string) {
  console.log(`  → ${path.basename(outputPath)}`);
  const inputPart = await fileToInlineData(inputPath);
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: 'user', parts: [inputPart, { text: prompt }] }],
  });
  const candidate = response.candidates?.[0];
  if (!candidate?.content?.parts) throw new Error('Sem parts');
  for (const part of candidate.content.parts) {
    if (part.inlineData?.data) {
      const buf = Buffer.from(part.inlineData.data, 'base64');
      await fs.writeFile(outputPath, buf);
      console.log(`    ✓ ${(buf.length / 1024).toFixed(0)}kb`);
      return;
    }
  }
  throw new Error('Sem imagem na resposta');
}

const BASE_INPUT = path.join(PROJECT_ROOT, 'public', 'animation', 'bases', 'base-00.webp');

const STEPS = [
  {
    out: 'scene-1.webp',
    pct: 6,
    expression: 'slight hopeful expression — eyes a tiny bit brighter, soft closed-lip almost-smile (~6% of items confirmed)',
    addition: 'a complete 8-piece beige/cream ceramic Brinox pot and pan set arranged neatly on the apartment floor along the right wall (since the apartment has no counters yet). Stack some pots, lay others flat. The set should look like it was just delivered and placed there waiting to be unpacked',
  },
  {
    out: 'scene-2.webp',
    pct: 12,
    expression: 'mildly content expression — soft closed smile, eyes engaged (~12% confirmed)',
    addition: 'a modern 3-seat dark charcoal grey fabric sofa against the left wall of the apartment, with two cushions. Position it parallel to the wall, leaving space around',
  },
  {
    out: 'scene-3.webp',
    pct: 18,
    expression: 'gentle smile — slightly more open, warmth in eyes (~18% confirmed)',
    addition: 'a queen-size bed against the back-left corner of the apartment, made up with a rose/blush quilted bedspread (Camesa Edredom Rosé style) and two pillows. The bed should be visible behind/beside Lina',
  },
];

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

async function generateWithRetry(inputPath: string, outputPath: string, prompt: string, attempt = 1): Promise<void> {
  try {
    await generate(inputPath, outputPath, prompt);
  } catch (err) {
    const msg = (err as Error).message;
    const retryMatch = msg.match(/retry in (\d+)s/);
    if (retryMatch && attempt <= 3) {
      const wait = (parseInt(retryMatch[1]) + 5) * 1000;
      console.log(`    ⏳ rate limit, aguardando ${wait / 1000}s antes de retry ${attempt}...`);
      await sleep(wait);
      return generateWithRetry(inputPath, outputPath, prompt, attempt + 1);
    }
    throw err;
  }
}

(async () => {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log('🎨 Piloto cenas compostas\n');

  // step-0 = base-00 (copy for comparison)
  const step0 = path.join(OUTPUT_DIR, 'scene-0.webp');
  await fs.copyFile(BASE_INPUT, step0);
  console.log(`  ✓ scene-0.webp (base, copied)`);

  let currentInput = BASE_INPUT;

  for (let i = 0; i < STEPS.length; i++) {
    const step = STEPS[i];
    const outputPath = path.join(OUTPUT_DIR, step.out);
    const prompt = `Edit this photo of Lina in her apartment. ADD a new item to the scene while keeping EVERYTHING ELSE EXACTLY THE SAME (Lina's identity, position, outfit, apartment layout, lighting from window, floor, walls, any items already placed). Only adjust her expression slightly.

ADDITION:
${step.addition}

INTEGRATION REQUIREMENTS (critical):
- The new item must look like it belongs in the scene — proper shadow on the floor beneath it, matching the warm morning light coming from the window on the left
- Correct perspective and scale relative to Lina and the room
- The item should NOT look like a sticker, a 2D PNG, or a flat overlay
- It must cast a realistic shadow consistent with the lighting in the room
- Maintain the same camera angle, framing, and aspect ratio as the input image

LINA'S EXPRESSION (subtle):
${step.expression}

Output: photorealistic image, same style and quality as input, no captions or text, full body of Lina visible.`;
    await generateWithRetry(currentInput, outputPath, prompt);
    currentInput = outputPath; // próxima usa a saída desta
    if (i < STEPS.length - 1) {
      console.log('    ⏸  pause 35s pra evitar rate limit...');
      await sleep(35000);
    }
  }

  console.log('\n✨ Piloto pronto em public/pilot/');
})().catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
