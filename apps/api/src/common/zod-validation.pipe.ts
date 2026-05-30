import { BadRequestException, Injectable, PipeTransform } from "@nestjs/common"
import { z } from "zod"
import { ErrorCode } from "@repo/schemas"

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: z.ZodType<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value)
    if (!result.success) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_ERROR,
        message: "Validation failed",
        issues: result.error.issues,
      })
    }
    return result.data
  }
}
