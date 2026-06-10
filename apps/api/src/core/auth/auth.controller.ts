import { Body, Controller, Get, HttpCode, Post, Req, Res, UnauthorizedException, UseGuards } from "@nestjs/common";
import { getRequestMetadata } from "../../common/utils/request-metadata.util";
import { AuthService } from "./auth.service";
import { CurrentUser } from "./decorators/current-user.decorator";
import { AuthMessageResponseDto } from "./dto/auth-message-response.dto";
import { AuthPermissionsResponseDto } from "./dto/auth-permissions-response.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { MeResponseDto } from "./dto/me-response.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ValidateResetPasswordTokenDto } from "./dto/validate-reset-password-token.dto";
import { ValidateResetPasswordTokenResponseDto } from "./dto/validate-reset-password-token-response.dto";
import { AuthRateLimit } from "./decorators/auth-rate-limit.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { AuthRateLimitGuard } from "./guards/auth-rate-limit.guard";
import { CurrentUser as CurrentUserType } from "./types/current-user.type";
import { CurrentOrganization } from "../organization-context/decorators/current-organization.decorator";
import { OrganizationGuard } from "../organization-context/guards/organization.guard";
import { CurrentOrganization as CurrentOrganizationType } from "../organization-context/types/current-organization.type";
import { AuthCookieService } from "./auth-cookie.service";
import { LogoutResponseDto } from "./dto/logout-response.dto";
import { extractBearerTokenFromHeaders } from "./utils/auth-token-extractor";

const FIFTEEN_MINUTES_IN_MS = 15 * 60 * 1000;
const LOGIN_RATE_LIMIT = {
  key: "login",
  limit: 5,
  ttlMs: FIFTEEN_MINUTES_IN_MS,
};
const FORGOT_PASSWORD_RATE_LIMIT = {
  key: "forgot-password",
  limit: 5,
  ttlMs: FIFTEEN_MINUTES_IN_MS,
};
const RESET_PASSWORD_RATE_LIMIT = {
  key: "reset-password",
  limit: 10,
  ttlMs: FIFTEEN_MINUTES_IN_MS,
};

@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
  ) {}

  @Post("login")
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit(LOGIN_RATE_LIMIT)
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true })
    res: {
      setHeader(name: string, value: string | string[]): void;
    },
    @Req()
    req: {
      headers: Record<string, string | string[] | undefined>;
      ip?: string;
    },
  ): Promise<AuthResponseDto> {
    return this.authService.login(dto, getRequestMetadata(req)).then((result) => {
      res.setHeader("Set-Cookie", this.authCookieService.buildAuthCookie(result.accessToken));
      return result;
    });
  }

  @Post("forgot-password")
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit(FORGOT_PASSWORD_RATE_LIMIT)
  forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req()
    req: {
      headers: Record<string, string | string[] | undefined>;
      ip?: string;
    },
  ): Promise<AuthMessageResponseDto> {
    return this.authService.forgotPassword(dto, getRequestMetadata(req));
  }

  @Post("reset-password")
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit(RESET_PASSWORD_RATE_LIMIT)
  resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req()
    req: {
      headers: Record<string, string | string[] | undefined>;
      ip?: string;
    },
  ): Promise<AuthMessageResponseDto> {
    return this.authService.resetPassword(dto, getRequestMetadata(req));
  }

  @Post("reset-password/validate")
  validateResetPasswordToken(
    @Body() dto: ValidateResetPasswordTokenDto,
  ): Promise<ValidateResetPasswordTokenResponseDto> {
    return this.authService.validateResetPasswordToken(dto);
  }

  @Get("me")
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: CurrentUserType): MeResponseDto {
    return user;
  }

  @Get("permissions")
  @UseGuards(JwtAuthGuard, OrganizationGuard)
  permissions(
    @CurrentUser() user: CurrentUserType,
    @CurrentOrganization() organization: CurrentOrganizationType,
  ): Promise<AuthPermissionsResponseDto> {
    return this.authService.getEffectivePermissions(user, organization);
  }

  @Post("logout")
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  async logout(
    @Res({ passthrough: true })
    res: {
      setHeader(name: string, value: string | string[]): void;
    },
    @Req()
    req: {
      headers: Record<string, string | string[] | undefined>;
      ip?: string;
    },
  ): Promise<LogoutResponseDto> {
    const accessToken =
      this.authCookieService.extractTokenFromCookieHeader(
        Array.isArray(req.headers.cookie) ? req.headers.cookie[0] : req.headers.cookie,
      ) ?? extractBearerTokenFromHeaders(req.headers);

    if (!accessToken) {
      throw new UnauthorizedException();
    }

    await this.authService.logout(accessToken, getRequestMetadata(req));
    res.setHeader("Set-Cookie", this.authCookieService.buildClearedAuthCookie());
    return { success: true };
  }
}
