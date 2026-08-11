import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { UserRole } from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCorporateAccountDto } from "./dto/create-corporate-account.dto";
import { AddEmployeeDto } from "./dto/add-employee.dto";

@Injectable()
export class CorporateService {
  constructor(private readonly prisma: PrismaService) {}

  async createAccount(dto: CreateCorporateAccountDto) {
    let admin = await this.prisma.user.findUnique({ where: { email: dto.adminEmail.toLowerCase() } });
    const temporaryPassword = admin ? undefined : randomBytes(9).toString("base64url");

    if (!admin) {
      const passwordHash = await bcrypt.hash(temporaryPassword as string, 12);
      admin = await this.prisma.user.create({
        data: {
          email: dto.adminEmail.toLowerCase(),
          passwordHash,
          firstName: "Corporate",
          lastName: "Admin",
          role: UserRole.CORPORATE_ADMIN,
          gdprConsentAt: new Date(),
        },
      });
    } else {
      await this.prisma.user.update({ where: { id: admin.id }, data: { role: UserRole.CORPORATE_ADMIN } });
    }

    const account = await this.prisma.corporateAccount.create({
      data: {
        companyName: dto.companyName,
        billingEmail: dto.billingEmail,
        vatNumber: dto.vatNumber,
        admins: { connect: { id: admin.id } },
      },
    });

    return { account, temporaryPassword };
  }

  private async resolveAccountForActor(actorId: string) {
    const account = await this.prisma.corporateAccount.findFirst({ where: { admins: { some: { id: actorId } } } });
    if (!account) throw new ForbiddenException("You do not administer a corporate account");
    return account;
  }

  async getMyAccount(actorId: string) {
    const account = await this.resolveAccountForActor(actorId);
    return this.prisma.corporateAccount.findUnique({
      where: { id: account.id },
      include: { employees: { include: { user: true } } },
    });
  }

  async addEmployee(actorId: string, dto: AddEmployeeDto) {
    const account = await this.resolveAccountForActor(actorId);

    let user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    let temporaryPassword: string | undefined;
    if (!user) {
      temporaryPassword = randomBytes(9).toString("base64url");
      const passwordHash = await bcrypt.hash(temporaryPassword, 12);
      user = await this.prisma.user.create({
        data: {
          email: dto.email.toLowerCase(),
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          role: UserRole.CUSTOMER,
          gdprConsentAt: new Date(),
        },
      });
    }

    const existingLink = await this.prisma.corporateEmployee.findUnique({ where: { userId: user.id } });
    if (existingLink) throw new BadRequestException("This user is already linked to a corporate account");

    const employee = await this.prisma.corporateEmployee.create({
      data: {
        corporateAccountId: account.id,
        userId: user.id,
        costCenter: dto.costCenter,
        monthlySpendLimitCents: dto.monthlySpendLimitCents,
      },
      include: { user: true },
    });

    return { employee, temporaryPassword };
  }

  async removeEmployee(actorId: string, employeeId: string) {
    const account = await this.resolveAccountForActor(actorId);
    const employee = await this.prisma.corporateEmployee.findUnique({ where: { id: employeeId } });
    if (!employee || employee.corporateAccountId !== account.id) throw new NotFoundException("Employee not found");
    return this.prisma.corporateEmployee.update({ where: { id: employeeId }, data: { isActive: false } });
  }

  async listBookings(actorId: string) {
    const account = await this.resolveAccountForActor(actorId);
    return this.prisma.booking.findMany({
      where: { corporateAccountId: account.id },
      include: { customer: true },
      orderBy: { pickupDateTime: "desc" },
    });
  }

  listAllAdmin() {
    return this.prisma.corporateAccount.findMany({
      include: { _count: { select: { employees: true, bookings: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
}
