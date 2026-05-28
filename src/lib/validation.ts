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
  bride_name: z.string().trim().min(1).max(80).optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data deve ser YYYY-MM-DD' }).optional(),
  event_time: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Hora deve ser HH:MM' }).optional(),
  event_address: z.string().trim().max(200).optional(),
  splash_title: z.string().trim().max(120).optional(),
  splash_subtitle: z.string().trim().max(240).optional(),
  reminder_enabled: z.boolean().optional(),
  reminder_hours_before: z.number().int().min(1).max(720).optional(),
  reminder_message_template: z.string().trim().min(10).max(1000).optional(),
  thankyou_enabled: z.boolean().optional(),
  thankyou_message_template: z.string().trim().min(10).max(1000).optional(),
  whatsapp_enabled: z.boolean().optional(),
});

export type ReservationCreateInput = z.infer<typeof ReservationCreateSchema>;
export type ReservationActionInput = z.infer<typeof ReservationActionSchema>;
export type SettingsUpdateInput = z.infer<typeof SettingsUpdateSchema>;
