# Prompt MASTER — uma imagem só com Lina + apê + todos os itens

## Como gerar

1. Abre https://aistudio.google.com/app/prompts/new_chat
2. Painel direito: modelo **Gemini 2.5 Flash Image**
3. Clica no botão `+` ou ícone de imagem → upload de [base-00.webp](../../public/animation/bases/base-00.webp) (Lina no apê vazio)
4. Cola o prompt abaixo
5. Aguarda gerar (~15-25s)
6. Clica direito na imagem gerada → "Save image as..." → salva nesta pasta como **`master.png`**
7. Me responde no chat: "master pronta"

## O prompt (cola exatamente isso)

```
Edit this photo of Lina in her empty apartment. PRESERVE Lina ABSOLUTELY IDENTICAL to the input photo — same face (every detail), same exact expression (do NOT change her smile or facial expression at all), same hair, same body, same position, same hands, same outfit (yellow short-sleeve top, light blue cargo jeans, white sneakers, white safety helmet labeled VISITANTE). The pixels of Lina herself should be UNCHANGED — only modify the empty space around her. Keep the same room (white walls, polished concrete floor, large window on the left side with warm morning light, view of building outside) intact.

ADD all the following items to the apartment, distributed in REGIONS around the room (kitchen, living, bedroom, bathroom, laundry) but ABSOLUTELY NOT overlapping Lina herself — she stays clearly visible in the center foreground. Each item must be naturally integrated into the scene: proper floor/surface contact, realistic shadows matching the window lighting on the left, correct perspective and scale relative to the room. NO floating items. NO stickers. NO 2D overlays. Photorealistic style throughout, same color grading as the input photo.

REGION 1 — Kitchen area (right side of the room):
- An improvised kitchen bench/counter (could be a temporary table or the floor along the wall) with:
  - A modern silver air fryer (Philco 6.5L style)
  - A stainless coffee maker (Electrolux ECM10 style, ~600ml)
  - A stainless sandwich maker
  - A modern electric kettle (black/silver)
  - A 3L blender with black base and red details (Philco Turbo)
  - A small vertical hand mixer
- Below or beside: a complete 8-piece beige/cream ceramic Brinox pot and pan set arranged neatly
- A Brinox pressure cooker (cream color, ceramic finish)
- A row of glass storage jars with bamboo lids (varying sizes 400ml to 2L) on a shelf or surface
- Some smaller kitchen items grouped: tongs, ladles, silicone utensils set, cutting board, multifunctional vegetable cutter, ice cube trays, can opener, mini hand processor, strainer set
- White round dining set on a small round white table: 16-piece white plates and bowls (Duralex Menu), stainless flatware (Tramontina Laguna 16-piece), 6 short glasses, 6 dessert glasses
- Stainless steel bowls with lids, 2 plastic deli containers, white slim 15L trash bin with click lid

REGION 2 — Living area (left side):
- A modern 3-seat dark charcoal grey fabric sofa against the left wall, with 2-3 cushions
- A medium rose-pink area rug in front of the sofa
- A tall green house plant (monstera or similar) in a black ceramic pot in the corner
- A tall black tower fan (86cm height) standing against another corner

REGION 3 — Bedroom area (back wall, behind/beside Lina):
- A queen-size bed made up neatly with a rose/blush quilted bedspread, two matching pillows, and a folded khaki microfiber fleece blanket at the foot of the bed
- An additional folded Boutis cobre-leito (light green/sage) on a chair or stool nearby

REGION 4 — Bathroom corner (could be near a doorway or in a defined corner):
- A bathroom accessory set of 4 pieces with bamboo lids (soap dispenser, toothbrush holder, cotton holder, tray) grouped together on a small surface
- A grey diatomite floor mat near the bathroom items
- 2 white box-exit floor mats stacked nearby

REGION 5 — Laundry corner:
- A modern steam iron (Oster Aeroceramic style) on its base
- A vertical cordless vacuum cleaner (Electrolux Powerspeed style) standing upright

REGION 6 — Wall art (above the main areas):
- 2-3 simple framed pictures with soft warm-toned abstract or botanical art on the walls

ABSOLUTE REQUIREMENTS:
- The room becomes BEAUTIFULLY FURNISHED and complete, but Lina remains the clear focus in the center
- All items have realistic shadows on floor/surfaces matching the soft window lighting from the left
- No item overlaps or hides Lina's body
- Photorealistic photography style, same camera angle and aspect ratio as the input
- No captions, watermarks, or text in the image
- High resolution, sharp details
```

## Se não gostar do resultado

Se a primeira gen ficou ruim (Lina deformada, itens flutuando, layout estranho):
1. Clica em "Regenerate" ou roda o mesmo prompt de novo — Gemini varia
2. Tenta 3-5 vezes se precisar — escolha a melhor
3. Se mesmo assim não fica bom, ajusta o prompt: simplificar lista de itens, especificar "view from doorway", etc.

Quando tiver UMA que te agrada → salva como `master.png` aqui e me avisa.
