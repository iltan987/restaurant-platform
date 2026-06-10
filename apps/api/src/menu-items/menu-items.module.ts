import { Module } from "@nestjs/common"

import { StorageModule } from "../storage/storage.module"
import { AvailabilityController } from "./availability.controller"
import { AvailabilityService } from "./availability.service"
import { MediaController } from "./media.controller"
import { MediaService } from "./media.service"
import { MenuItemsController } from "./menu-items.controller"
import { MenuItemsService } from "./menu-items.service"
import { OptionGroupsController } from "./option-groups.controller"
import { OptionGroupsService } from "./option-groups.service"

@Module({
  imports: [StorageModule],
  controllers: [
    MenuItemsController,
    OptionGroupsController,
    AvailabilityController,
    MediaController,
  ],
  providers: [
    MenuItemsService,
    OptionGroupsService,
    AvailabilityService,
    MediaService,
  ],
})
export class MenuItemsModule {}
