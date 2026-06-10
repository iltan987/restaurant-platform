import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_FILTER } from "@nestjs/core"

import { AreasModule } from "./areas/areas.module"
import { CategoriesModule } from "./categories/categories.module"
import { HttpExceptionFilter } from "./common/http-exception.filter"
import { FloorsModule } from "./floors/floors.module"
import { MenuItemsModule } from "./menu-items/menu-items.module"
import { PrismaModule } from "./prisma/prisma.module"
import { RestaurantsModule } from "./restaurants/restaurants.module"
import { TablesModule } from "./tables/tables.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RestaurantsModule,
    FloorsModule,
    AreasModule,
    TablesModule,
    CategoriesModule,
    MenuItemsModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
