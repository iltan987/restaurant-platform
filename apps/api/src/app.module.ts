import { Module } from "@nestjs/common"
import { ConfigModule } from "@nestjs/config"
import { APP_FILTER } from "@nestjs/core"
import { LoggerModule } from "nestjs-pino"

import { ActivityModule } from "./activity/activity.module"
import { AllergensModule } from "./allergens/allergens.module"
import { AreasModule } from "./areas/areas.module"
import { AuthzModule } from "./auth/authz.module"
import { CategoriesModule } from "./categories/categories.module"
import { HttpExceptionFilter } from "./common/http-exception.filter"
import { env } from "./config/env"
import { FloorsModule } from "./floors/floors.module"
import { InvitationsModule } from "./invitations/invitations.module"
import { MembersModule } from "./members/members.module"
import { MenuModule } from "./menu/menu.module"
import { MenuItemsModule } from "./menu-items/menu-items.module"
import { PrismaModule } from "./prisma/prisma.module"
import { RestaurantsModule } from "./restaurants/restaurants.module"
import { TablesModule } from "./tables/tables.module"
import { TagsModule } from "./tags/tags.module"
import { HealthController } from "./health.controller"

@Module({
  imports: [
    // `validate` runs the env schema at boot — fail fast with a readable error.
    ConfigModule.forRoot({ isGlobal: true, validate: () => env }),
    // Structured logging. Verbosity via LOG_LEVEL (default "info"; "debug" for
    // verbose local). Pretty single-line output in dev; raw JSON in prod (Render
    // captures stdout). Each request gets an auto log line with a request id.
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        // Skip the platform liveness probe (Render hits /api/health every ~5s)
        // so it doesn't drown the request log.
        autoLogging: { ignore: (req) => req.url === "/api/health" },
        ...(env.NODE_ENV !== "production"
          ? {
              transport: {
                target: "pino-pretty",
                options: { singleLine: true },
              },
            }
          : {}),
      },
    }),
    PrismaModule,
    AuthzModule,
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
    InvitationsModule,
    MembersModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule {}
