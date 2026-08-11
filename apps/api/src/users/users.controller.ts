import { Body, Controller, Delete, Get, Param, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { CreateAddressDto } from "./dto/create-address.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequestUser } from "../auth/types/request-user";

@ApiTags("users")
@ApiBearerAuth()
@Controller("users/me")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getProfile(@CurrentUser() user: RequestUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch()
  updateProfile(@CurrentUser() user: RequestUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get("addresses")
  listAddresses(@CurrentUser() user: RequestUser) {
    return this.usersService.listAddresses(user.id);
  }

  @Post("addresses")
  createAddress(@CurrentUser() user: RequestUser, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(user.id, dto);
  }

  @Delete("addresses/:id")
  deleteAddress(@CurrentUser() user: RequestUser, @Param("id") id: string) {
    return this.usersService.deleteAddress(user.id, id);
  }

  @Post("gdpr/delete-request")
  requestDeletion(@CurrentUser() user: RequestUser) {
    return this.usersService.requestDataDeletion(user.id);
  }
}
