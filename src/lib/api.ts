import type { ApiError, ErrorCode } from '~/types/shared';

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Request-Id': crypto.randomUUID(),
      ...headers,
    },
  });
}

export function errorResponse(code: ErrorCode, message: string, status: number, details?: Record<string, unknown>): Response {
  const body: ApiError = {
    error: { code, message, details, request_id: crypto.randomUUID() },
  };
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function readClientIp(request: Request): string {
  const headers = request.headers;
  return (
    headers.get('x-nf-client-connection-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
