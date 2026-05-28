# Prompt BEFORE — mesma cena da master, mas SEM os itens

Objetivo: gerar uma imagem **idêntica à `master.png`** (mesmo cenário, mesma janela, mesma parede, mesmo piso, mesma Lina) — **só removendo os itens adicionados** (móveis, eletros, decor). Como se você apagasse só os móveis com Photoshop.

Resultado esperado: cenário 100% igual à master + Lina pixel-a-pixel idêntica + apê COMPLETAMENTE VAZIO ao redor dela.

## Como gerar

1. Abre [aistudio.google.com](https://aistudio.google.com/app/prompts/new_chat)
2. Modelo: **Gemini 2.5 Flash Image**
3. Faz upload da `master.png` (que você já gerou) — essa é a ÚNICA referência
4. Cola o prompt abaixo
5. Gera, salva como **`before.png`** nesta pasta
6. Me responde "before pronto"

## O prompt

```
Take this image of Lina in her furnished apartment. Generate a new version of the EXACT SAME SCENE, with EVERYTHING preserved pixel-perfect:

- Lina herself: ABSOLUTELY IDENTICAL — same face, same expression, same outfit (yellow top, light jeans, white sneakers, white safety helmet VISITANTE), same body position, same hands, same shadow under her, same hair. Her pixels must NOT change.
- The room structure: SAME walls (same color, same texture, same finish), SAME window (same frame, same size, same view of the building outside through the glass), SAME floor (same material, same color, same finish), SAME ceiling, SAME lighting from the window (same direction, same warmth, same intensity).

ONLY change: REMOVE every single furniture item, appliance, decoration, and accessory that was added to the apartment. Remove ALL of:

- The bed with the rose/blush bedspread and pillows
- The grey fabric sofa with cushions
- The pink/rose area rug
- The tall green house plant
- The white round dining table with all the plates, flatware, and glasses on it
- The chairs around the dining table
- All the kitchen appliances grouped on the side (air fryer, coffee maker, blender, kettle, sandwich maker, mixer)
- The complete pot and pan set on the floor
- The pressure cooker
- The black tower fan
- The steam iron
- The wall shelf with all the glass storage jars
- The framed pictures/paintings on the wall behind her
- All the small kitchen utensils, bowls, containers, ice trays scattered on the floor
- Any other item not part of the building structure itself

After removing all these items, the apartment must look COMPLETELY EMPTY — only the architectural elements remain (walls, floor, ceiling, window, doorway if any). The empty surfaces where items used to be (the floor, the walls behind shelves) must look natural and continuous with the rest of the apartment — no ghost outlines, no leftover shadows of removed items, no patches of different texture.

Lina remains exactly as she is, in the exact same position, with the exact same shadow falling on the bare floor.

Photorealistic style, same camera angle, same framing, same lighting, same aspect ratio as input. No captions or text.
```

## Por que isso funciona pro CSS sprite reveal

| Layer | Conteúdo |
|---|---|
| Base (z=1) | `before.png` — Lina + apê vazio + mesma janela/parede/piso da master |
| Top (z=2) | `master.png` — Lina + apê CHEIO + mesma janela/parede/piso |

Os 2 são **estruturalmente idênticos** — só diferem nos itens. Quando o reveal acontece em uma região, o usuário vê literalmente o item aparecer naquele ponto (parede/piso já estavam OK). Sem mudança de cenário, só de mobília.

## Se não ficar bom

- A Lina mudou → enfatiza no prompt: "DO NOT modify Lina at all, every pixel of her must remain"
- Algum item sobrou → lista esse item especificamente na seção de remoção
- A parede/piso ficou com manchas/marcas dos itens removidos → enfatiza: "the floor and walls must look natural and continuous, no leftover marks from removed items"
- Regenera 2-3x se precisar — Gemini varia
