import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { CreateAddressDto } from "./dto/create-address.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { savedAddresses: true, driver: true, corporateEmployee: { include: { corporateAccount: true } } },
    });
    if (!user) throw new NotFoundException("User not found");
    const { passwordHash, ...safe } = user;
    return safe;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({ where: { id: userId }, data: dto });
  }

  listAddresses(userId: string) {
    return this.prisma.savedAddress.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
  }

  createAddress(userId: string, dto: CreateAddressDto) {
    return this.prisma.savedAddress.create({ data: { ...dto, userId } });
  }

  async deleteAddress(userId: string, addressId: string) {
    const address = await this.prisma.savedAddress.findFirst({ where: { id: addressId, userId } });
    if (!address) throw new NotFoundException("Address not found");
    await this.prisma.savedAddress.delete({ where: { id: addressId } });
    return { success: true };
  }

  /** GDPR: anonymize personal data and deactivate the account rather than hard-deleting booking history needed for accounting. */
  async requestDataDeletion(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException("User not found");
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        dataDeletionRequestedAt: new Date(),
        isActive: false,
        firstName: "Deleted",
        lastName: "User",
        email: `deleted-${userId}@magona.invalid`,
        phone: null,
        photoUrl: null,
      },
    });
  }
}
