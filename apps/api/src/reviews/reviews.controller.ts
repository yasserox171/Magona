import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { UserRole } from "@magona/shared";
import { ReviewsService } from "./reviews.service";
import { CreateReviewDto } from "./dto/create-review.dto";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Public } from "../common/decorators/public.decorator";
import { RequestUser } from "../auth/types/request-user";

@ApiTags("reviews")
@Controller("reviews")
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @ApiBearerAuth()
  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Post()
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(user.id, dto);
  }

  @Public()
  @Get("driver/:driverId")
  listForDriver(@Param("driverId") driverId: string) {
    return this.reviewsService.listForDriver(driverId);
  }
}
