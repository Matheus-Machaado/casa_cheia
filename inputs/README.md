# Inputs — Casa Cheia (NÃO commitar)

Arquivos esperados aqui antes de rodar `npm run generate-assets`:

## Obrigatórios

- `lina-apt-empty.jpg` — Foto-base da Lina no apartamento vazio (capacete + blusa amarela + jeans claro). Mínimo 1024×1536 (vertical).

## Opcionais (recomendados pra fidelidade do rosto)

- `lina-smile.jpg` — selfie ou foto dela sorrindo (qualquer cenário). Pra Gemini referenciar como ela é quando feliz.
- `lina-neutral.jpg` — foto dela com expressão neutra. Pra calibrar as bases intermediárias.

## Formato

JPG ou PNG, max 8MB por arquivo (limite Gemini API).

## Privacidade

Esta pasta inteira é gitignored (`.gitignore` cobre `lina-*.{jpg,jpeg,png,webp}`). Fotos pessoais NUNCA vão pro repo.
