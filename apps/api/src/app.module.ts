import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_FILTER } from "@nestjs/core"

import { ActivityModule } from "./activity/activity.module"
import { AllergensModule } from "./allergens/allergens.module"
import { AreasModule } from "./areas/areas.module"
import { CategoriesModule } from "./categories/categories.module"
import { HttpExceptionFilter } from "./common/http-exception.filter"
import { FloorsModule } from "./floors/floors.module"
import { MenuModule } from "./menu/menu.module"
import { MenuItemsModule } from "./menu-items/menu-items.module"
import { PrismaModule } from "./prisma/prisma.module"
import { RestaurantsModule } from "./restaurants/restaurants.module"
import { TablesModule } from "./tables/tables.module"
import { TagsModule } from "./tags/tags.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    ActivityModule,
    RestaurantsModule,
    FloorsModule,
    AreasModule,
    TablesModule,
    CategoriesModule,
    MenuItemsModule,
    MenuModule,
    AllergensModule,
    TagsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
