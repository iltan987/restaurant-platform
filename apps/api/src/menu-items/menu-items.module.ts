import { Module } from "@nestjs/common"

import { MenuItemsController } from "./menu-items.controller"
import { MenuItemsService } from "./menu-items.service"
import { OptionGroupsController } from "./option-groups.controller"
import { OptionGroupsService } from "./option-groups.service"

@Module({
  controllers: [MenuItemsController, OptionGroupsController],
  providers: [MenuItemsService, OptionGroupsService],
})
export class MenuItemsModule {}
