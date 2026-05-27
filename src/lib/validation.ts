import { z } from 'zod';

export const ReservationCreateSchema = z.object({
  product_id: z.string().min(1).max(80),
  qty: z.number().int().min(1).max(20),
  guest_name: z.string().trim().min(2).max(80),
  guest_email: z.string().trim().toLowerCase().email().max(120),
  guest_phone: z.string().trim().nullable().optional()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine((v) => v === null || /^\(\d{2}\)\s\d{4,5}-\d{4}$/.test(v), {
      message: 'Telefone inválido (formato esperado: (11) 99999-9999)',
    }),
  message: z.string().trim().max(280).nullable().optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  hp_url: z.string().max(0, 'Honeypot tripped'),
});

export const ReservationActionSchema = z.object({
  action: z.enum(['cancel', 'restore']),
  reason: z.string().max(200).nullable().optional(),
});

export type ReservationCreateInput = z.infer<typeof ReservationCreateSchema>;
export type ReservationActionInput = z.infer<typeof ReservationActionSchema>;
