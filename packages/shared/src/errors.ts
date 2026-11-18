export const ERROR_CODES = [
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_FAILED',
  'RATE_LIMITED',
  'CONFLICT',
  'ROOM_FULL',
  'ROOM_NOT_IN_LOBBY',
  'NOT_HOST',
  'INVALID_ROLE_SET',
  'NOT_YOUR_TURN',
  'INVALID_TARGET',
  'ABILITY_USED',
  'PLAYER_DEAD',
  'REPORT_WINDOW_CLOSED',
  'INTERNAL',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export interface AppErrorBody {
  code: ErrorCode;
  message: string;
  details?: unknown;
}
