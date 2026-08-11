import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcryptjs";
import { randomBytes, createHash } from "crypto";
import { AuthTokens, UserRole } from "@magona/shared";
import { PrismaService } from "../prisma/prisma.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { NotificationsService } from "../notifications/notifications.service";

interface GoogleProfile {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
  photoUrl?: string;
}

const REFRESH_TOKEN_TTL_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notifications: NotificationsService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) {
      throw new ConflictException("An account with this email already exists");
    }
    if (!dto.gdprConsent) {
      throw new UnauthorizedException("You must accept the privacy policy to register");
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        marketingOptIn: dto.marketingOptIn ?? false,
        gdprConsentAt: new Date(),
        role: UserRole.CUSTOMER,
      },
    });

    await this.notifications.notifyWelcome(user.id);
    return this.issueTokensForUser(user.id, user.email, user.role as UserRole);
  }

  async validateCredentials(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("Invalid email or password");
    }
    const matches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!matches) {
      throw new UnauthorizedException("Invalid email or password");
    }
    if (!user.isActive) {
      throw new UnauthorizedException("This account has been deactivated");
    }
    return user;
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.validateCredentials(dto);
    return this.issueTokensForUser(user.id, user.email, user.role as UserRole);
  }

  async loginWithGoogle(profile: GoogleProfile): Promise<AuthTokens> {
    let user = await this.prisma.user.findUnique({ where: { googleId: profile.googleId } });
    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email: profile.email.toLowerCase() } });
    }
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email: profile.email.toLowerCase(),
          googleId: profile.googleId,
          firstName: profile.firstName || "Google",
          lastName: profile.lastName || "User",
          photoUrl: profile.photoUrl,
          isEmailVerified: true,
          role: UserRole.CUSTOMER,
          gdprConsentAt: new Date(),
        },
      });
    } else if (!user.googleId) {
      user = await this.prisma.user.update({ where: { id: user.id }, data: { googleId: profile.googleId } });
    }
    return this.issueTokensForUser(user.id, user.email, user.role as UserRole);
  }

  async refresh(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revoked: false, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!stored) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }
    await this.prisma.refreshToken.update({ where: { id: stored.id }, data: { revoked: true } });
    return this.issueTokensForUser(stored.user.id, stored.user.email, stored.user.role as UserRole);
  }

  async logout(userId: string, rawRefreshToken?: string) {
    if (rawRefreshToken) {
      const tokenHash = this.hashToken(rawRefreshToken);
      await this.prisma.refreshToken.updateMany({ where: { userId, tokenHash }, data: { revoked: true } });
    } else {
      await this.prisma.refreshToken.updateMany({ where: { userId, revoked: false }, data: { revoked: true } });
    }
  }

  private async issueTokensForUser(userId: string, email: string, role: UserRole): Promise<AuthTokens> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email, role },
      { secret: process.env.JWT_ACCESS_SECRET ?? "dev-access-secret", expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m" },
    );

    const rawRefreshToken = randomBytes(48).toString("hex");
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: 15 * 60,
    };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
