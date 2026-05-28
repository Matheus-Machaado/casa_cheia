import type { APIRoute } from 'astro';
import { getImage } from '~/lib/uploads';

export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const raw = params.key;
  const key = Array.isArray(raw) ? raw.join('/') : (raw as string | undefined);
  if (!key) return new Response('Not found', { status: 404 });

  const data = await getImage(key);
  if (!data) return new Response('Not found', { status: 404 });

  return new Response(data.buffer, {
    status: 200,
    headers: {
      'Content-Type': data.mime,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
};
