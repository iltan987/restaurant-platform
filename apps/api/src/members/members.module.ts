import { Module } from "@nestjs/common"

import { InvitationsModule } from "../invitations/invitations.module"
import {
  MembersController,
  RestaurantMembersController,
} from "./members.controller"
import { MembersService } from "./members.service"

@Module({
  imports: [InvitationsModule],
  controllers: [MembersController, RestaurantMembersController],
  providers: [MembersService],
  exports: [MembersService],
})
export class MembersModule {}
