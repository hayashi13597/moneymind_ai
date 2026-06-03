import { zodResolver } from "@hookform/resolvers/zod";
import type { FieldValues, Resolver } from "react-hook-form";
import type { z } from "zod";

export function createZodResolver<TSchema extends z.ZodType>(
  schema: TSchema,
) {
  return zodResolver(schema as never) as Resolver<
    z.input<TSchema> & FieldValues,
    unknown,
    z.output<TSchema> & FieldValues
  >;
}
