import type { APIRoute } from 'astro';
import { json, errorResponse } from '~/lib/api';
import { requireAdminUser } from '~/lib/serverAuth';
import { putImage } from '~/lib/uploads';

export const prerender = false;

const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/avif',
]);

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdminUser(request))) {
    return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return errorResponse('BAD_REQUEST', 'Esperado multipart/form-data', 400);
  }

  const file = formData.get('file');
  if (!(file instanceof File)) {
    return errorResponse('BAD_REQUEST', 'Campo "file" obrigatório', 400);
  }
  if (file.size === 0) {
    return errorResponse('BAD_REQUEST', 'Arquivo vazio', 400);
  }
  if (file.size > MAX_SIZE) {
    return errorResponse('BAD_REQUEST', `Imagem muito grande (máx 5MB)`, 400);
  }
  if (!ALLOWED_MIMES.has(file.type)) {
    return errorResponse('BAD_REQUEST', 'Formato não suportado. Use PNG, JPG, WEBP, GIF ou AVIF.', 400);
  }

  const ext = MIME_TO_EXT[file.type] ?? (file.name.split('.').pop() ?? 'png');
  const buffer = await file.arrayBuffer();
  const key = await putImage(buffer, ext, file.type);
  const url = `/api/images/${key}`;
  return json({ data: { url, key } }, 201, { 'Cache-Control': 'no-store, private' });
};
