import { Module } from "@nestjs/common"

import { AvailabilityController } from "./availability.controller"
import { AvailabilityService } from "./availability.service"
import { MenuItemsController } from "./menu-items.controller"
import { MenuItemsService } from "./menu-items.service"
import { OptionGroupsController } from "./option-groups.controller"
import { OptionGroupsService } from "./option-groups.service"

@Module({
  controllers: [
    MenuItemsController,
    OptionGroupsController,
    AvailabilityController,
  ],
  providers: [MenuItemsService, OptionGroupsService, AvailabilityService],
})
export class MenuItemsModule {}
