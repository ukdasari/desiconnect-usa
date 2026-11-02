import { HttpException, HttpStatus } from "@nestjs/common";
import { ERROR_CODES } from "@desiconnect/contracts";

type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

/** HTTP exception carrying a stable machine-readable error code. */
export class AppException extends HttpException {
  constructor(
    status: HttpStatus,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: Record<string, string[]>,
  ) {
    super({ code, message, details }, status);
  }
}

export const notFound = (what = "Resource") => new AppException(HttpStatus.NOT_FOUND, ERROR_CODES.NOT_FOUND, `${what} not found`);
export const forbidden = (message = "You do not have permission to do this") =>
  new AppException(HttpStatus.FORBIDDEN, ERROR_CODES.FORBIDDEN, message);
export const unauthenticated = (message = "Sign in to continue") =>
  new AppException(HttpStatus.UNAUTHORIZED, ERROR_CODES.UNAUTHENTICATED, message);
export const conflict = (message: string) => new AppException(HttpStatus.CONFLICT, ERROR_CODES.CONFLICT, message);
export const badRequest = (message: string, details?: Record<string, string[]>) =>
  new AppException(HttpStatus.BAD_REQUEST, ERROR_CODES.VALIDATION_FAILED, message, details);
export const tooMany = (message: string) => new AppException(HttpStatus.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMITED, message);
