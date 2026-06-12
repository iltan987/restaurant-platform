import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common"

import {
  type AcceptInvitationInput,
  acceptInvitationSchema,
  type InviteOwnerInput,
  inviteOwnerSchema,
} from "@repo/schemas"

import { AdminAuthGuard } from "../auth/auth-guard.factory"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { InvitationsService } from "./invitations.service"

type InvitationRecord = {
  id: string
  email: string
  role: "OWNER" | "MANAGER" | "STAFF"
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED"
  expiresAt: Date
  createdAt: Date
}

/** Serialize a DB invitation into the on-contract shape. */
function toInvitation(i: InvitationRecord) {
  return {
    id: i.id,
    email: i.email,
    role: i.role,
    status: i.status,
    expiresAt: i.expiresAt.toISOString(),
    createdAt: i.createdAt.toISOString(),
  }
}

/** Admin surface: invite/list/revoke restaurant-owner invitations. */
@Controller("admin")
@UseGuards(AdminAuthGuard)
export class AdminInvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post("restaurants/:restaurantId/invitations")
  async inviteOwner(
    @Param("restaurantId") restaurantId: string,
    @Body(new ZodValidationPipe(inviteOwnerSchema)) body: InviteOwnerInput
  ) {
    const invitation = await this.invitations.invite({
      restaurantId,
      email: body.email,
      role: "OWNER",
      invitedByAdmin: true,
    })
    return { invitation: toInvitation(invitation) }
  }

  @Get("restaurants/:restaurantId/invitations")
  async list(@Param("restaurantId") restaurantId: string) {
    const invitations = await this.invitations.list(restaurantId)
    return { invitations: invitations.map(toInvitation) }
  }

  @Delete("invitations/:invitationId")
  @HttpCode(204)
  revoke(@Param("invitationId") invitationId: string) {
    return this.invitations.revoke(invitationId)
  }
}

/** Public token surface: look up and accept an invitation. */
@Controller("invitations")
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Get(":token")
  lookup(@Param("token") token: string) {
    return this.invitations.lookup(token)
  }

  @Post(":token/accept")
  async accept(
    @Param("token") token: string,
    @Body(new ZodValidationPipe(acceptInvitationSchema))
    body: AcceptInvitationInput
  ) {
    await this.invitations.accept(token, body.password)
    return { ok: true }
  }
}
