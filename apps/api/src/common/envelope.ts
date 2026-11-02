import {
  type ArgumentsHost,
  Catch,
  type CallHandler,
  type ExceptionFilter,
  type ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  type NestInterceptor,
} from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { Prisma } from "@desiconnect/database";
import { ERROR_CODES, type ApiErrorBody, type PaginationMeta } from "@desiconnect/contracts";
import type { Request, Response } from "express";
import { map, type Observable } from "rxjs";

/** Return this from a controller to include pagination metadata in the envelope. */
export class Paginated<T> {
  constructor(
    public readonly items: T[],
    public readonly meta: PaginationMeta & Record<string, unknown>,
  ) {}

  static of<T>(items: T[], total: number, page: number, pageSize: number, extra: Record<string, unknown> = {}) {
    return new Paginated(items, { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)), ...extra });
  }
}

export function traceIdOf(req: Request): string {
  const id = (req as Request & { id?: unknown }).id;
  return typeof id === "string" ? id : String(id ?? "");
}

/** Wraps every successful response as `{ data, meta?, traceId }`. */
@Injectable()
export class EnvelopeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    return next.handle().pipe(
      map((body: unknown) => {
        // Streams and raw responses (file downloads) bypass the envelope.
        if (res.headersSent || body instanceof Buffer) return body;
        const traceId = traceIdOf(req);
        if (body instanceof Paginated) return { data: body.items, meta: body.meta, traceId };
        return { data: body ?? null, traceId };
      }),
    );
  }
}

/** Converts every error into `{ error: { code, message, details? }, traceId }`. Never leaks stack traces. */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("Exceptions");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();
    const traceId = traceIdOf(req);
    const { status, body } = this.toBody(exception);
    if (status >= 500) this.logger.error({ err: exception, traceId }, "Unhandled error");
    const payload: ApiErrorBody = { error: body, traceId };
    res.status(status).json(payload);
  }

  private toBody(exception: unknown): { status: number; body: ApiErrorBody["error"] } {
    if (exception instanceof ThrottlerException) {
      return { status: 429, body: { code: ERROR_CODES.RATE_LIMITED, message: "Too many requests. Please slow down and try again." } };
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();
      if (typeof response === "object" && response && "code" in response) {
        const r = response as { code: string; message: string; details?: Record<string, string[]> };
        return { status, body: { code: r.code, message: r.message, details: r.details } };
      }
      const message =
        typeof response === "string"
          ? response
          : Array.isArray((response as { message?: unknown }).message)
            ? ((response as { message: string[] }).message.join(", "))
            : String((response as { message?: unknown }).message ?? exception.message);
      return { status, body: { code: codeForStatus(status), message } };
    }
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") return { status: 409, body: { code: ERROR_CODES.CONFLICT, message: "This record already exists" } };
      if (exception.code === "P2025") return { status: 404, body: { code: ERROR_CODES.NOT_FOUND, message: "Resource not found" } };
    }
    return { status: 500, body: { code: ERROR_CODES.INTERNAL, message: "Something went wrong on our side" } };
  }
}

function codeForStatus(status: number): string {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return ERROR_CODES.VALIDATION_FAILED;
    case HttpStatus.UNAUTHORIZED:
      return ERROR_CODES.UNAUTHENTICATED;
    case HttpStatus.FORBIDDEN:
      return ERROR_CODES.FORBIDDEN;
    case HttpStatus.NOT_FOUND:
      return ERROR_CODES.NOT_FOUND;
    case HttpStatus.CONFLICT:
      return ERROR_CODES.CONFLICT;
    case HttpStatus.PAYLOAD_TOO_LARGE:
      return ERROR_CODES.PAYLOAD_TOO_LARGE;
    case HttpStatus.TOO_MANY_REQUESTS:
      return ERROR_CODES.RATE_LIMITED;
    default:
      return status >= 500 ? ERROR_CODES.INTERNAL : ERROR_CODES.VALIDATION_FAILED;
  }
}
