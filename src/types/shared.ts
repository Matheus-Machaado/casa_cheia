export type Room =
  | 'cozinha' | 'eletro' | 'quarto' | 'banheiro' | 'lavanderia' | 'sala' | 'limpeza';

export const ROOMS: Room[] = ['cozinha', 'eletro', 'quarto', 'banheiro', 'lavanderia', 'sala', 'limpeza'];

export const ROOM_LABELS: Record<Room, string> = {
  cozinha: 'Cozinha',
  eletro: 'Eletro',
  quarto: 'Quarto',
  banheiro: 'Banheiro',
  lavanderia: 'Lavanderia',
  sala: 'Sala',
  limpeza: 'Limpeza',
};

export const ROOM_ICONS: Record<Room, string> = {
  cozinha: 'utensils',
  eletro: 'zap',
  quarto: 'bed',
  banheiro: 'bath',
  lavanderia: 'shirt',
  sala: 'sofa',
  limpeza: 'sparkles',
};

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
  overlay_id: string | null;
}

export interface Settings {
  bride_name: string;
  event_date: string;
  event_time: string;
  event_address: string;
  splash_title: string;
  splash_subtitle: string;
  reminder_enabled: boolean;
}

export type ReservationStatus = 'confirmada' | 'cancelada';

export interface Reservation {
  _v: 1;
  id: string;
  product_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  qty: number;
  message: string | null;
  status: ReservationStatus;
  created_at: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  reminder_sent_at: string | null;
  email_log: EmailLogEntry[];
  ip_hash: string;
  user_agent_hash: string;
}

export interface EmailLogEntry {
  type: 'confirmation' | 'admin-notification' | 'reminder' | 'cancellation';
  sent_at: string;
  resend_message_id: string | null;
  to: string;
  error: string | null;
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
  guest_email: string;
  guest_phone?: string | null;
  message?: string | null;
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
  overlays_active: string[];
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
