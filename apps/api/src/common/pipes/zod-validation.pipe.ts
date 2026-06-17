import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodSchema } from "zod";

/**
 * Valida y tipa el payload con un esquema Zod compartido (packages/shared).
 * Uso: @Body(new ZodValidationPipe(loginSchema)) body: LoginInput
 */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(
        result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
      );
    }
    return result.data;
  }
}
