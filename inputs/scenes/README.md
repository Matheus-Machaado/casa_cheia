# Cenas progressivas — geração manual

Você gera 10 cenas no painel do Google AI Studio e salva aqui.

## Setup uma vez

1. Abre https://aistudio.google.com/app/prompts/new_chat
2. No painel direito: modelo = **Gemini 2.5 Flash Image**
3. Pega a foto-base da Lina: `projects/casacheia/public/animation/bases/base-00.webp`

## Por cena

Pra cada cena (1 até 10):
1. Clica no botão `+` ou ícone de imagem → faz upload da cena ANTERIOR
   - Cena 1 → upload da `base-00.webp`
   - Cena 2 → upload da `scene-1.png` (que você acabou de gerar)
   - Cena 3 → upload da `scene-2.png`
   - ...
2. Cola o prompt correspondente abaixo
3. Aguarda gerar (~10s)
4. Clica direito na imagem gerada → "Save image as..."
5. Salva nesta pasta como `scene-N.png` (substituindo N pelo número)

Quando tiver as 10, me responde "10 cenas prontas" que eu plugo no código.

---

## Os 10 prompts

### Cena 1 (5% — primeira reserva)
Input: base-00.webp

```
Keep this exact photo of Lina in her empty apartment unchanged — same Lina, same position, same outfit (yellow top, light jeans, white sneakers, white safety helmet), same room layout, same warm morning lighting from the window. Adjust ONLY her expression slightly: a hint of a closed-lip soft smile, eyes a tiny bit brighter — barely hopeful.

ADD to the scene, integrated naturally:
- A queen-size bed against the back-left wall area, made up with a rose/blush quilted bedspread (Camesa Edredom Rosé style), two matching pillows. Position it as if just delivered, slightly visible behind/to the side of Lina.

CRITICAL: The bed must look like it's actually in the room — proper floor shadow beneath, matching the lighting direction from the window. No stickers, no flat overlays, no 2D PNGs. Photorealistic integration.
```

---

### Cena 2 (15% — cozinha começa)
Input: scene-1.png

```
Keep the scene exactly as in the input (Lina, bed, room layout, lighting all the same). Slight expression progression: a soft warm smile, content.

ADD, integrated naturally:
- A complete 8-piece beige/cream ceramic Brinox pot and pan set arranged on the kitchen floor or along the right wall (since there's no counter yet). Stack some pots, place others flat.
- A Brinox pressure cooker next to the set.

CRITICAL: Items cast realistic floor shadows under same window lighting. Look like real objects in the room, not stickers.
```

---

### Cena 3 (25% — sala começa)
Input: scene-2.png

```
Keep everything from input scene. Expression: gentle warm smile, eyes engaged.

ADD:
- A modern 3-seat dark charcoal grey fabric sofa positioned against the left wall, with two cushions. Leave space around it.

CRITICAL: realistic shadow, matches lighting, sized correctly for the room.
```

---

### Cena 4 (35% — decoração sala)
Input: scene-3.png

```
Keep everything. Expression: relaxed smile, slight cheek raise.

ADD:
- A medium rose-pink area rug in front of the sofa.
- A tall green house plant (monstera-like) in a black ceramic pot in the corner near the sofa.

CRITICAL: rug lies flat on the floor with shadows, plant casts shadow on wall.
```

---

### Cena 5 (45% — mesa de jantar)
Input: scene-4.png

```
Keep everything. Expression: open smile, slight teeth visible.

ADD:
- A round white dining table for 4, with a 16-piece white dinner set (plates, bowls), stainless flatware, and glasses already arranged on top.
- 2-4 simple chairs around the table.
- Position in the middle area between sofa and kitchen items.

CRITICAL: dishes properly placed on table surface, chairs cast shadows.
```

---

### Cena 6 (55% — eletros)
Input: scene-5.png

```
Keep everything. Expression: bigger smile, eyes brighter.

ADD:
- A modern silver air fryer on the kitchen floor area near the pot set.
- A stainless coffee maker next to it.
- A 3L black Philco blender with red base.

CRITICAL: items grouped logically, all on same level (floor), realistic shadows.
```

---

### Cena 7 (65% — banheiro detalhes + lavanderia)
Input: scene-6.png

```
Keep everything. Expression: clear genuine smile.

ADD:
- A small bathroom accessory set (4 pieces with bamboo lids: soap dispenser, toothbrush holder, cotton holder, tray) grouped on the floor in a corner.
- A vertical cordless Electrolux vacuum cleaner standing in another corner.
- A steam iron on a small stand or floor.

CRITICAL: items in corners, integrated, real shadows.
```

---

### Cena 8 (75% — potes + utensílios)
Input: scene-7.png

```
Keep everything. Expression: animated smile, slight gesture.

ADD:
- A row of glass storage jars with bamboo lids (varying sizes 400ml-2L) arranged on the floor near the kitchen items, OR on the dining table.
- Some kitchen utensils visible (knife block or similar).

CRITICAL: jars stand upright, casting individual shadows, looking like real glass with light passing through.
```

---

### Cena 9 (90% — quase tudo)
Input: scene-8.png

```
Keep everything. Expression: warm laughter, joyful.

ADD:
- A floor fan (tall black tower fan, 86cm) in another corner.
- A small diatomite floor mat near the bathroom items.
- A few decorative pillows added to the sofa.

CRITICAL: tower fan stands vertical, casting shadow.
```

---

### Cena 10 (100% — completo, celebração)
Input: scene-9.png

```
Keep all items from input scene exactly as they are. NOW change Lina's pose and expression significantly:
- Full radiant smile (showing teeth, joyful, eyes crinkled at corners)
- Arms slightly out in subtle celebration
- Body language jubilant
- Maybe taking off or holding the helmet in one hand
- Keep her outfit and position in roughly the same area of the room

The apartment is now fully furnished and Lina is celebrating — capture that pure joy and "we did it, casa cheia!" energy.

CRITICAL: maintain photorealistic style, same lighting, all previously added items still visible in their positions.
```

---

## Quando terminar

Você terá:
- `scene-1.png` (5%)
- `scene-2.png` (15%)
- `scene-3.png` (25%)
- `scene-4.png` (35%)
- `scene-5.png` (45%)
- `scene-6.png` (55%)
- `scene-7.png` (65%)
- `scene-8.png` (75%)
- `scene-9.png` (90%)
- `scene-10.png` (100%)

Me responde "10 cenas prontas" no chat principal que eu plugo no código.

## Dica

Se uma cena ficar ruim (Lina deformada, item flutuando, etc.):
- Tenta regenerar com o MESMO prompt (Gemini varia entre tentativas)
- Ou edita o prompt mudando posição ("on the floor next to the sofa" → "behind the sofa")

Se mesmo regenerando 3x não ficar bom, me avisa qual cena tá problema que ajustamos juntos.
