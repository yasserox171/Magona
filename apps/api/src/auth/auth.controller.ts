import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthService } from "./auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { Public } from "../common/decorators/public.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { GoogleAuthGuard } from "./guards/google-auth.guard";
import { RequestUser } from "./types/request-user";
import { PrismaService } from "../prisma/prisma.service";

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentUser() user: RequestUser, @Body() dto: RefreshTokenDto) {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  @ApiBearerAuth()
  @Get("me")
  async me(@CurrentUser() user: RequestUser) {
    const full = await this.prisma.user.findUnique({ where: { id: user.id } });
    if (!full) return null;
    const { passwordHash, ...safe } = full;
    return safe;
  }

  // --- Google OAuth ---

  @Public()
  @Get("google")
  @UseGuards(GoogleAuthGuard)
  googleAuth() {
    // Passport redirects to Google; handler body intentionally empty.
  }

  @Public()
  @Get("google/callback")
  @UseGuards(GoogleAuthGuard)
  async googleAuthCallback(@Req() req: Request, @Res() res: Response) {
    const tokens = await this.authService.loginWithGoogle(req.user as any);
    const redirectUrl = new URL("/auth/callback", process.env.WEB_URL ?? "http://localhost:3000");
    redirectUrl.searchParams.set("accessToken", tokens.accessToken);
    redirectUrl.searchParams.set("refreshToken", tokens.refreshToken);
    res.redirect(redirectUrl.toString());
  }
}
