import type { APIRoute } from 'astro';
import { z } from 'zod';
import { json, errorResponse } from '~/lib/api';
import {
  listAllRuntimeProducts,
  updateProductOverride,
  resetProductOverride,
  addProduct,
  deleteProduct,
} from '~/lib/products';
import { requireAdminUser } from '~/lib/serverAuth';

export const prerender = false;

// Room agora é id livre (lowercase + hífen). Lista vive em Settings.rooms.
const RoomSchema = z.string().trim().min(1).max(40).regex(/^[a-z0-9][a-z0-9-]*$/, {
  message: 'ID de cômodo inválido',
});

const MAX_PRICE_CENTS = 99_999_999; // R$ 999.999,99

const PatchSchema = z.object({
  id: z.string().min(1),
  patch: z.object({
    title: z.string().trim().min(1).max(200).optional(),
    price_brl_cents: z.number().int().min(0).max(MAX_PRICE_CENTS).nullable().optional(),
    amazon_url: z.string().trim().url().max(500).optional(),
    image_url: z.string().trim().url().max(500).optional(),
    description: z.string().trim().max(500).optional(),
    qty_desejada: z.number().int().min(0).max(1000).optional(),
    order: z.number().int().min(0).max(9999).optional(),
    active: z.boolean().optional(),
    room: RoomSchema.optional(),
  }),
});

const ResetSchema = z.object({ id: z.string().min(1) });
const DeleteSchema = z.object({ id: z.string().min(1) });

const CreateSchema = z.object({
  id: z.string().trim().max(80).optional(),
  title: z.string().trim().min(1).max(200),
  price_brl_cents: z.number().int().min(0).max(MAX_PRICE_CENTS).nullable(),
  amazon_url: z.string().trim().url().max(500),
  image_url: z.string().trim().url().max(500),
  description: z.string().trim().max(500).default(''),
  room: RoomSchema,
  qty_desejada: z.number().int().min(1).max(1000).default(1),
  order: z.number().int().min(0).max(9999).optional(),
  active: z.boolean().default(true),
});

export const GET: APIRoute = async ({ request }) => {
  if (!(await requireAdminUser(request))) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);
  const products = await listAllRuntimeProducts();
  return json({ data: products }, 200, { 'Cache-Control': 'no-store, private' });
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!(await requireAdminUser(request))) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse('BAD_REQUEST', 'JSON inválido', 400); }
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) return errorResponse('BAD_REQUEST', parsed.error.issues[0].message, 400, {
    field: parsed.error.issues[0].path.join('.'),
  });
  try {
    const next = await updateProductOverride(parsed.data.id, parsed.data.patch);
    return json({ data: next }, 200);
  } catch (e) {
    const msg = (e as Error).message;
    if (msg === 'product-not-found') return errorResponse('NOT_FOUND', 'Produto não encontrado', 404);
    return errorResponse('INTERNAL', msg, 500);
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!(await requireAdminUser(request))) return errorResponse('UNAUTHORIZED', 'Login admin necessário', 401);
  const url = new URL(request.url);
  const action = url.searchParams.get('action');

  if (action === 'reset') {
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse('BAD_REQUEST', 'JSON inválido', 400); }
    const parsed = ResetSchema.safeParse(body);
    if (!parsed.success) return errorResponse('BAD_REQUEST', parsed.error.issues[0].message, 400);
    try {
      const next = await resetProductOverride(parsed.data.id);
      return json({ data: next }, 200);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg === 'product-not-found') return errorResponse('NOT_FOUND', 'Produto não encontrado', 404);
      return errorResponse('INTERNAL', msg, 500);
    }
  }

  if (action === 'delete') {
    let body: unknown;
    try { body = await request.json(); } catch { return errorResponse('BAD_REQUEST', 'JSON inválido', 400); }
    const parsed = DeleteSchema.safeParse(body);
    if (!parsed.success) return errorResponse('BAD_REQUEST', parsed.error.issues[0].message, 400);
    await deleteProduct(parsed.data.id);
    return json({ data: { ok: true } }, 200);
  }

  // POST sem action = criar produto novo
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse('BAD_REQUEST', 'JSON inválido', 400); }
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return errorResponse('BAD_REQUEST', parsed.error.issues[0].message, 400, {
    field: parsed.error.issues[0].path.join('.'),
  });
  const created = await addProduct(parsed.data);
  return json({ data: created }, 201);
};
