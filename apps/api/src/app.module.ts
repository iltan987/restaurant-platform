import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_FILTER } from "@nestjs/core"

import { AreasModule } from "./areas/areas.module"
import { HttpExceptionFilter } from "./common/http-exception.filter"
import { FloorsModule } from "./floors/floors.module"
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
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
