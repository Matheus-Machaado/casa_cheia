/**
 * Room é só um identificador (string). A lista de cômodos válidos
 * vive em Settings.rooms e é editável pela Lina no painel.
 */
export type Room = string;

export interface RoomDef {
  id: string;
  label: string;
  order: number;
}

export const DEFAULT_ROOMS: RoomDef[] = [
  { id: 'cozinha', label: 'Cozinha', order: 0 },
  { id: 'eletro', label: 'Eletro', order: 1 },
  { id: 'quarto', label: 'Quarto', order: 2 },
  { id: 'banheiro', label: 'Banheiro', order: 3 },
  { id: 'lavanderia', label: 'Lavanderia', order: 4 },
  { id: 'sala', label: 'Sala', order: 5 },
  { id: 'limpeza', label: 'Limpeza', order: 6 },
];

/**
 * Helper pra resolver label de um cômodo dado a lista atual. Se o id
 * não existir mais (produto referenciando cômodo removido), volta
 * o próprio id capitalizado.
 */
export function roomLabel(rooms: RoomDef[], id: string): string {
  const found = rooms.find((r) => r.id === id);
  if (found) return found.label;
  return id.charAt(0).toUpperCase() + id.slice(1);
}

/**
 * Gera um id slug a partir de um label livre. Lowercase, remove
 * diacríticos (acentos) e troca não-alfanum por hífen.
 */
export function slugifyRoomId(label: string): string {
  return label
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export interface Product {
  id: string;
  title: string;
  price_brl_cents: number | null;
  amazon_dp: string;
  amazon_url: string;
  image_url: string;
  description: string;
  room: Room;
  qty_desejada: number;
  order: number;
  active: boolean;
}

export interface Settings {
  bride_name: string;
  event_date: string;
  event_time: string;
  // Endereço estruturado — composto via buildEventAddress(settings)
  event_cep: string;          // só dígitos: "12345678"
  event_street: string;
  event_number: string;
  event_complement: string;   // opcional ("" se vazio)
  event_neighborhood: string;
  event_city: string;
  event_state: string;        // UF 2 chars
  // Versão concatenada — derivada (não armazenada separadamente; computada).
  event_address: string;
  splash_title: string;
  splash_subtitle: string;
  rooms: RoomDef[];
  reminder_message_template: string;
  thankyou_complete_message_template: string;
  thankyou_post_message_template: string;
}

export type MessageKind = 'reminder' | 'thankyou-complete' | 'thankyou-post';

export type ReservationStatus = 'confirmada' | 'cancelada';

export interface Reservation {
  _v: 1;
  id: string;
  product_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  qty: number;
  message: string | null;
  status: ReservationStatus;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  activity_log: ActivityLogEntry[];
  ip_hash: string;
  user_agent_hash: string;
}

export type ActivityChannel = 'email' | 'whatsapp';
export type ActivityType =
  | 'admin-notification'
  | 'cancellation'
  | 'whatsapp-link-generated';

export interface ActivityLogEntry {
  channel: ActivityChannel;
  type: ActivityType;
  sent_at: string;
  to: string;
  provider_message_id: string | null;
  error: string | null;
  kind?: MessageKind;
}

export type ReservationPublic = Omit<Reservation, '_v' | 'ip_hash' | 'user_agent_hash'>;

export interface ApiSuccess<T> { data: T; next_cursor?: string; }
export interface ApiError {
  error: { code: ErrorCode; message: string; details?: Record<string, unknown>; request_id: string; };
}
export type ApiResult<T> = ApiSuccess<T> | ApiError;
export type ErrorCode = 'BAD_REQUEST' | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT' | 'RATE_LIMITED' | 'INTERNAL';

export interface CreateReservationBody {
  product_id: string;
  qty: number;
  guest_name: string;
  hp_url: string;
}

export interface CreateReservationResponse {
  id: string;
  product_id: string;
  qty: number;
  status: ReservationStatus;
  created_at: string;
  guest_name: string;
}

export interface PatchReservationBody {
  action: 'cancel' | 'restore';
  reason?: string | null;
}

export interface ProductAvailability {
  qty_desejada: number;
  qty_reservada: number;
  available: number;
}

export interface AvailabilitySnapshot {
  generated_at: string;
  total_progress_pct: number;
  total_confirmed: number;
  total_desired: number;
  products: Record<string, ProductAvailability>;
}

export interface WhatsAppLinkResponse {
  url: string;
  message: string;
}

export function isApiError<T>(result: ApiResult<T>): result is ApiError {
  return 'error' in result;
}

export const EXPRESSION_BUCKETS = [0, 25, 50, 75, 100] as const;
export type ExpressionBucket = typeof EXPRESSION_BUCKETS[number];

export function bucketForPct(pct: number): ExpressionBucket {
  if (pct >= 100) return 100;
  if (pct >= 75) return 75;
  if (pct >= 50) return 50;
  if (pct >= 25) return 25;
  return 0;
}
