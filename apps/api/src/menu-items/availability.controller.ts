import { Body, Controller, Param, Put, UseGuards } from "@nestjs/common"

import { type SetAvailabilityInput, setAvailabilitySchema } from "@repo/schemas"

import { RequirePermission } from "../auth/require-permission.decorator"
import { RestaurantAccessGuard } from "../auth/restaurant-access.guard"
import { byMenuItem } from "../auth/scope-resolvers"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { AvailabilityService } from "./availability.service"

@Controller()
@UseGuards(RestaurantAccessGuard)
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Put("menu-items/:id/availability")
  @RequirePermission("menu:manage", byMenuItem())
  setWindows(
    @Param("id") itemId: string,
    @Body(new ZodValidationPipe(setAvailabilitySchema))
    input: SetAvailabilityInput
  ) {
    return this.availability.setWindows(itemId, input.windows)
  }
}
