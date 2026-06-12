import { Body, Controller, Param, Put, UseGuards } from "@nestjs/common"

import { type SetAvailabilityInput, setAvailabilitySchema } from "@repo/schemas"

import { AdminAuthGuard } from "../auth/auth-guard.factory"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { AvailabilityService } from "./availability.service"

@Controller()
@UseGuards(AdminAuthGuard)
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Put("menu-items/:id/availability")
  setWindows(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(setAvailabilitySchema))
    input: SetAvailabilityInput
  ) {
    return this.availability.setWindows(itemId, input.windows)
  }
}
