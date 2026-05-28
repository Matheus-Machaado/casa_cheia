import { z } from 'zod';

export const ReservationCreateSchema = z.object({
  product_id: z.string().min(1).max(80),
  qty: z.number().int().min(1).max(20),
  guest_name: z.string().trim().min(2).max(80),
  hp_url: z.string().max(0, 'Honeypot tripped'),
});

export const ReservationActionSchema = z.object({
  action: z.enum(['cancel', 'restore']),
  reason: z.string().max(200).nullable().optional(),
});

export const SettingsUpdateSchema = z.object({
  bride_name: z.string().trim().min(1).max(80).optional(),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: 'Data inválida (YYYY-MM-DD)' }).optional(),
  event_time: z.string().regex(/^\d{2}:\d{2}$/, { message: 'Hora inválida (HH:MM)' }).optional(),
  event_address: z.string().trim().min(3).max(200).optional(),
  splash_title: z.string().trim().min(3).max(120).optional(),
  splash_subtitle: z.string().trim().min(3).max(240).optional(),
  reminder_message_template: z.string().trim().min(10).max(1000).optional(),
  thankyou_complete_message_template: z.string().trim().min(10).max(1000).optional(),
  thankyou_post_message_template: z.string().trim().min(10).max(1000).optional(),
});

export const MessageKindSchema = z.enum(['reminder', 'thankyou-complete', 'thankyou-post']);

export type ReservationCreateInput = z.infer<typeof ReservationCreateSchema>;
export type ReservationActionInput = z.infer<typeof ReservationActionSchema>;
export type SettingsUpdateInput = z.infer<typeof SettingsUpdateSchema>;
