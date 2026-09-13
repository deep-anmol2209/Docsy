import { NextRequest } from "next/server";
import { ZodSchema, ZodTypeAny } from "zod";
import { ValidationError } from "@/src/errors/app-error";
import { getZodFieldErrors } from "@/src/utils/zod-error";

export async function parseBody<Schema extends ZodTypeAny>(
  req: NextRequest,
  schema: Schema,
): Promise<import("zod").infer<Schema>> {
  let payload: unknown;

  try {
    payload = await req.json();
  } catch (error) {
    if (error instanceof SyntaxError && /json/i.test(error.message)) {
      throw new ValidationError("Malformed JSON body");
    }

    throw error;
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new ValidationError("Validation failed", getZodFieldErrors(parsed.error));
  }

  return parsed.data;
}

export async function parseParams<Schema extends ZodTypeAny>(
  params: Record<string, string> | Promise<Record<string, string>> | undefined,
  schema: Schema,
): Promise<import("zod").infer<Schema>> {
  const resolvedParams = await params;
  const parsed = schema.safeParse(resolvedParams ?? {});

  if (!parsed.success) {
    throw new ValidationError("Invalid route parameters", getZodFieldErrors(parsed.error));
  }

  return parsed.data;
}
