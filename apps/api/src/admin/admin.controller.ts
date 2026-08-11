import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@magona/shared";
import { AdminService } from "./admin.service";
import { UpsertPricingRuleDto } from "./dto/upsert-pricing-rule.dto";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";

@ApiTags("admin")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("overview")
  getOverview() {
    return this.adminService.getDashboardOverview();
  }

  @Get("commissions")
  getCommissions(@Query("from") from?: string, @Query("to") to?: string) {
    return this.adminService.getCommissionsSummary(from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }

  @Get("pricing-rules")
  listPricingRules() {
    return this.adminService.listPricingRules();
  }

  @Post("pricing-rules")
  upsertPricingRule(@Body() dto: UpsertPricingRuleDto) {
    return this.adminService.upsertPricingRule(dto);
  }

  @Get("customers")
  listCustomers() {
    return this.adminService.listCustomers();
  }
}
