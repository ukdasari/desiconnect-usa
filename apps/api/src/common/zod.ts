import { applyDecorators, Body, type PipeTransform, Query } from "@nestjs/common";
import { ApiBody, ApiQuery } from "@nestjs/swagger";
import { z, type ZodType } from "zod";
import { badRequest } from "./errors";

/** Converts Zod issues into `{ "field.path": ["message"] }`. */
export function zodDetails(error: z.ZodError): Record<string, string[]> {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.join(".") : "_";
    (details[key] ??= []).push(issue.message);
  }
  return details;
}

export class ZodValidationPipe<T extends ZodType> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) throw badRequest("Some fields are invalid", zodDetails(result.error));
    return result.data;
  }
}

function jsonSchema(schema: ZodType): Record<string, unknown> {
  try {
    return z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) as Record<string, unknown>;
  } catch {
    return { type: "object" };
  }
}

/** Validates the request body with a shared Zod schema and documents it in OpenAPI. */
export const ZodBody = (schema: ZodType) => Body(new ZodValidationPipe(schema));
export const ApiZodBody = (schema: ZodType) => applyDecorators(ApiBody({ schema: jsonSchema(schema) }));

/** Validates the query string with a shared Zod schema. */
export const ZodQuery = (schema: ZodType) => Query(new ZodValidationPipe(schema));
export function ApiZodQuery(schema: ZodType) {
  const js = jsonSchema(schema) as { properties?: Record<string, Record<string, unknown>> };
  const props = js.properties ?? {};
  return applyDecorators(
    ...Object.entries(props).map(([name, prop]) => ApiQuery({ name, required: false, schema: prop })),
  );
}
