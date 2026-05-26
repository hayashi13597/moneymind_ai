import { z } from "zod";

const transactionTypeSchema = z.enum(["income", "expense"]);

const optionalTrimmedString = z.string().trim().min(1).optional();

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Tên danh mục là bắt buộc."),
  type: transactionTypeSchema.nullable(),
  color: optionalTrimmedString,
  icon: optionalTrimmedString,
});

export const categoryUpdateSchema = categoryCreateSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Cần ít nhất một trường để cập nhật.",
  });

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
