import { Body, Controller, Delete, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@magona/shared";
import { CorporateService } from "./corporate.service";
import { CreateCorporateAccountDto } from "./dto/create-corporate-account.dto";
import { AddEmployeeDto } from "./dto/add-employee.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { RequestUser } from "../auth/types/request-user";
import { InvoicesService } from "../invoices/invoices.service";

@ApiTags("corporate")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("corporate")
export class CorporateController {
  constructor(
    private readonly corporateService: CorporateService,
    private readonly invoicesService: InvoicesService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post("accounts")
  createAccount(@Body() dto: CreateCorporateAccountDto) {
    return this.corporateService.createAccount(dto);
  }

  @Roles(UserRole.ADMIN)
  @Get("accounts")
  listAll() {
    return this.corporateService.listAllAdmin();
  }

  @Roles(UserRole.CORPORATE_ADMIN)
  @Get("me")
  getMyAccount(@CurrentUser() user: RequestUser) {
    return this.corporateService.getMyAccount(user.id);
  }

  @Roles(UserRole.CORPORATE_ADMIN)
  @Post("employees")
  addEmployee(@CurrentUser() user: RequestUser, @Body() dto: AddEmployeeDto) {
    return this.corporateService.addEmployee(user.id, dto);
  }

  @Roles(UserRole.CORPORATE_ADMIN)
  @Delete("employees/:id")
  removeEmployee(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.corporateService.removeEmployee(user.id, id);
  }

  @Roles(UserRole.CORPORATE_ADMIN)
  @Get("bookings")
  listBookings(@CurrentUser() user: RequestUser) {
    return this.corporateService.listBookings(user.id);
  }

  @Roles(UserRole.CORPORATE_ADMIN)
  @Get("invoices")
  async listInvoices(@CurrentUser() user: RequestUser) {
    const account = await this.corporateService.getMyAccount(user.id);
    return this.invoicesService.listForAccount(account!.id);
  }
}
