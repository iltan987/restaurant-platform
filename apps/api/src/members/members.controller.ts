import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common"

import {
  type InviteMemberInput,
  inviteMemberSchema,
  type UpdateMemberRoleInput,
  updateMemberRoleSchema,
} from "@repo/schemas"

import { DashboardAuthGuard } from "../auth/auth-guard.factory"
import { CurrentUser } from "../auth/current-user.decorator"
import { ZodValidationPipe } from "../common/zod-validation.pipe"
import { MembersService } from "./members.service"

/** Dashboard "self" surface — what the signed-in user belongs to. */
@Controller("me")
@UseGuards(DashboardAuthGuard)
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get("restaurants")
  async myRestaurants(@CurrentUser() user: { id: string }) {
    const memberships = await this.members.listMemberships(user.id)
    return { memberships }
  }
}

/**
 * Restaurant team management (US3). Every route resolves the caller's
 * `RestaurantMember` for `:restaurantId` and denies if absent or role-
 * insufficient — never trusting the client's claimed scope (FR-011/013/016).
 */
@Controller("restaurants/:restaurantId/members")
@UseGuards(DashboardAuthGuard)
export class RestaurantMembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  async list(
    @Param("restaurantId") restaurantId: string,
    @CurrentUser() user: { id: string }
  ) {
    await this.members.requireMembership(restaurantId, user.id)
    const members = await this.members.listMembers(restaurantId)
    return { members }
  }

  @Post("invitations")
  async invite(
    @Param("restaurantId") restaurantId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: InviteMemberInput
  ) {
    await this.members.requirePermission(
      restaurantId,
      user.id,
      "members:manage"
    )
    const invitation = await this.members.inviteMember(
      restaurantId,
      user.id,
      body
    )
    return {
      invitation: {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        createdAt: invitation.createdAt.toISOString(),
      },
    }
  }

  @Patch(":userId")
  async changeRole(
    @Param("restaurantId") restaurantId: string,
    @Param("userId") userId: string,
    @CurrentUser() user: { id: string },
    @Body(new ZodValidationPipe(updateMemberRoleSchema))
    body: UpdateMemberRoleInput
  ) {
    await this.members.requirePermission(
      restaurantId,
      user.id,
      "members:manage"
    )
    const member = await this.members.changeRole(
      restaurantId,
      userId,
      body.role
    )
    return { member }
  }

  @Delete(":userId")
  @HttpCode(204)
  async remove(
    @Param("restaurantId") restaurantId: string,
    @Param("userId") userId: string,
    @CurrentUser() user: { id: string }
  ) {
    await this.members.requirePermission(
      restaurantId,
      user.id,
      "members:manage"
    )
    await this.members.removeMember(restaurantId, userId)
  }
}
