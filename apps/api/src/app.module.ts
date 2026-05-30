import { Module } from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"
import { ConfigModule } from "@nestjs/config"
import { AppController } from "./app.controller"
import { AppService } from "./app.service"
import { HttpExceptionFilter } from "./common/http-exception.filter"
import { PrismaModule } from "./prisma/prisma.module"
import { RestaurantsModule } from "./restaurants/restaurants.module"

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RestaurantsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
