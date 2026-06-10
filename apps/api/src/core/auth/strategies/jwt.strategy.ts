import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { AuthCookieService } from "../auth-cookie.service";
import { AuthService } from "../auth.service";
import { TokenBlacklistService } from "../token-blacklist.service";
import { CurrentUser } from "../types/current-user.type";
import { JwtPayload } from "../types/jwt-payload.type";
import { extractBearerTokenFromHeaders } from "../utils/auth-token-extractor";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly authCookieService: AuthCookieService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>("JWT_SECRET");
    if (!secret) {
      throw new Error("JWT_SECRET is required");
    }

    super({
      jwtFromRequest: (req: { headers: Record<string, string | string[] | undefined> }) => {
        const cookieHeader = Array.isArray(req.headers.cookie)
          ? req.headers.cookie[0]
          : req.headers.cookie;
        return (
          this.authCookieService.extractTokenFromCookieHeader(cookieHeader) ??
          extractBearerTokenFromHeaders(req.headers)
        );
      },
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: secret,
    });
  }

  async validate(
    req: { headers: Record<string, string | string[] | undefined> },
    payload: JwtPayload,
  ): Promise<CurrentUser> {
    if (!payload?.sub || !payload.jti) {
      throw new UnauthorizedException();
    }

    if (await this.tokenBlacklistService.isRevoked(payload.jti)) {
      throw new UnauthorizedException();
    }

    return this.authService.getCurrentUserById(payload.sub);
  }
}
