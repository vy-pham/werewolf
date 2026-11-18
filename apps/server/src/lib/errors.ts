import type { AppErrorBody, ErrorCode } from '@werewolf/shared';

const STATUS: Partial<Record<ErrorCode, number>> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_HOST: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
};

/** Throw this from services; REST and socket layers turn it into `AppErrorBody`. */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string = code,
    readonly details?: unknown,
  ) {
    super(message);
  }

  get statusCode(): number {
    return STATUS[this.code] ?? 400;
  }

  toBody(): AppErrorBody {
    return { code: this.code, message: this.message, details: this.details };
  }
}
