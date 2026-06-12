import { Global, Module } from "@nestjs/common"

import { ActivityController } from "./activity.controller"
import { ActivityService } from "./activity.service"

/**
 * Global so any service can inject `ActivityService` to record events without
 * threading the module through every importer (mirrors PrismaModule).
 */
@Global()
@Module({
  controllers: [ActivityController],
  providers: [ActivityService],
  exports: [ActivityService],
})
export class ActivityModule {}
