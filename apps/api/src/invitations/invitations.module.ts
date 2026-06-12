import { Module } from "@nestjs/common"

import {
  AdminInvitationsController,
  InvitationsController,
} from "./invitations.controller"
import { InvitationsService } from "./invitations.service"

@Module({
  controllers: [AdminInvitationsController, InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
