
import { NextRequest } from "next/server";
import type {
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/client";
import type { ZodError } from "zod";
import { APIError } from "better-auth/api";
import { AppError } from "@/src/errors/app-error";
import { jsonError } from "@/src/utils/api-response";
import { logger } from "@/src/utils/logger";
import type { RouteContext, RouteHandler } from "@/src/utils/route-context";

const isSyntaxError = (error: unknown): error is SyntaxError =>
  error instanceof SyntaxError && /json/i.test(error.message);

const isPrismaKnownRequestError = (
  error: unknown,
): error is PrismaClientKnownRequestError =>
  typeof error === "object" && error !== null &&
  ((error as { code?: unknown }).code ?? null) !== null;

const isPrismaValidationError = (
  error: unknown,
): error is PrismaClientValidationError =>
  typeof error === "object" && error !== null &&
  (error as { name?: unknown }).name === "PrismaClientValidationError";

const isZodError = (error: unknown): error is ZodError =>
  typeof error === "object" && error !== null &&
  "issues" in error && typeof (error as any).flatten === "function";

const createErrorId = () =>
  globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2);

/** Maps any thrown error to a `Response` — the single place every non-2xx status gets decided, so the request-summary log below always has an accurate status. */
function toErrorResponse(error: unknown): Response {
  if (error instanceof AppError) {
    return jsonError(error.message, error.details, error.statusCode);
  }

  if (error instanceof APIError) {
    return jsonError(
      error.message,
      (error as { details?: unknown }).details ?? null,
      (error as { statusCode?: number }).statusCode ?? 500,
    );
  }

  if (isPrismaKnownRequestError(error)) {
    switch (error.code) {
      case "P2002":
        return jsonError("Unique constraint failed.", { target: error.meta?.target }, 409);
      case "P2025":
        return jsonError("Record not found.", { target: error.meta?.target }, 404);
      case "P2003":
        return jsonError("Foreign key constraint failed.", { target: error.meta?.target }, 400);
      default:
        logger.error("Prisma client error", {
          code: error.code,
          meta: error.meta,
          message: error.message,
        });
        return jsonError("Database error occurred.", { code: error.code }, 500);
    }
  }

  if (isPrismaValidationError(error)) {
    return jsonError("Database validation failed.", { message: error.message }, 400);
  }

  if (isZodError(error)) {
    return jsonError("Validation failed.", error.flatten().fieldErrors, 400);
  }

  if (isSyntaxError(error)) {
    return jsonError("Malformed JSON body.", undefined, 400);
  }

  const errorId = createErrorId();
  logger.error("Unhandled API error", { errorId, error });

  return jsonError("Internal Server Error.", { errorId }, 500);
}

export function withErrorHandler<Params extends Record<string, string> = Record<string, string>>(
  handler: RouteHandler<Params>,
) {
  return async (
    req: NextRequest,
    context: RouteContext<Params> = {},
  ): Promise<Response> => {
    const startedAt = Date.now();
    let response: Response;

    try {
      response = await handler(req, context);
    } catch (error) {
      response = toErrorResponse(error);
    }

    // One line per request, success or failure — status/duration only,
    // never the request/response body, so this is safe to always log.
    logger.info("API request", {
      method: req.method,
      path: req.nextUrl.pathname,
      status: response.status,
      durationMs: Date.now() - startedAt,
    });

    return response;
  };
}
