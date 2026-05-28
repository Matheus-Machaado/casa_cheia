import { getStore } from '@netlify/blobs';

const UPLOADS_STORE = 'uploads';

function store() {
  return getStore({ name: UPLOADS_STORE });
}

/**
 * Salva uma imagem no Blobs e retorna a key (pra montar URL pública via
 * /api/images/<key>).
 */
export async function putImage(buffer: ArrayBuffer, ext: string, mime: string): Promise<string> {
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'bin';
  const key = `products/${crypto.randomUUID()}.${safeExt}`;
  await store().set(key, buffer, { metadata: { mime } });
  return key;
}

export interface StoredImage {
  buffer: ArrayBuffer;
  mime: string;
}

export async function getImage(key: string): Promise<StoredImage | null> {
  const data = await store().getWithMetadata(key, { type: 'arrayBuffer' });
  if (!data || !data.data) return null;
  const mime = (data.metadata as { mime?: string })?.mime ?? 'application/octet-stream';
  return { buffer: data.data as ArrayBuffer, mime };
}
