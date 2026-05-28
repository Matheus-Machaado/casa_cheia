import { z } from 'zod';

const PHONE_BR_PATTERN = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

export const ReservationCreateSchema = z.object({
  product_id: z.string().min(1).max(80),
  qty: z.number().int().min(1).max(20),
  guest_name: z.string().trim().min(2).max(80),
  guest_phone: z.string().trim().regex(PHONE_BR_PATTERN, {
    message: 'Telefone obrigatório no formato (11) 99999-9999',
  }),
  message: z.string().trim().max(280).nullable().optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  hp_url: z.string().max(0, 'Honeypot tripped'),
});

export const ReservationActionSchema = z.object({
  action: z.enum(['cancel', 'restore']),
  reason: z.string().max(200).nullable().optional(),
});

export const SettingsUpdateSchema = z.object({
  reminder_message_template: z.string().trim().min(10).max(1000).optional(),
  thankyou_complete_message_template: z.string().trim().min(10).max(1000).optional(),
  thankyou_post_message_template: z.string().trim().min(10).max(1000).optional(),
});

export const MessageKindSchema = z.enum(['reminder', 'thankyou-complete', 'thankyou-post']);

export type ReservationCreateInput = z.infer<typeof ReservationCreateSchema>;
export type ReservationActionInput = z.infer<typeof ReservationActionSchema>;
export type SettingsUpdateInput = z.infer<typeof SettingsUpdateSchema>;
