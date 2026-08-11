import { Controller, Get, Param, Patch } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { PrismaService } from "../prisma/prisma.service";
import { RequestUser } from "../auth/types/request-user";

@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  list(@CurrentUser() user: RequestUser) {
    return this.prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId: user.id },
      data: { read: true },
    });
  }
}
