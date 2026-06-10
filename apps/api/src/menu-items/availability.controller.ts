import { Body, Controller, Param, Put } from "@nestjs/common"

import { type SetAvailabilityInput, setAvailabilitySchema } from "@repo/schemas"

import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { AvailabilityService } from "./availability.service"

@Controller()
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
