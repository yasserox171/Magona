import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@magona/shared";
import { InvoicesService } from "./invoices.service";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@ApiTags("invoices")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("invoices")
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  listAll() {
    return this.invoicesService.listAllAdmin();
  }

  @Roles(UserRole.ADMIN)
  @Post("corporate/:accountId/generate")
  generate(@Param("accountId") accountId: string, @Body() body: { periodStart: string; periodEnd: string }) {
    return this.invoicesService.generateInvoiceForAccount(accountId, new Date(body.periodStart), new Date(body.periodEnd));
  }

  @Roles(UserRole.ADMIN)
  @Patch(":id/mark-paid")
  markPaid(@Param("id") id: string) {
    return this.invoicesService.markPaid(id);
  }
}
