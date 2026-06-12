import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-jwt";
import { AuthTransportService } from "../auth-transport.service";
import { AuthService } from "../auth.service";
import { TokenBlacklistService } from "../token-blacklist.service";
import { CurrentUser } from "../types/current-user.type";
import { JwtPayload } from "../types/jwt-payload.type";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly authService: AuthService,
    private readonly authTransportService: AuthTransportService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    configService: ConfigService,
  ) {
    const secret = configService.get<string>("JWT_SECRET");
    if (!secret) {
      throw new Error("JWT_SECRET is required");
    }

    super({
      jwtFromRequest: (req: { headers: Record<string, string | string[] | undefined> }) => {
        return this.authTransportService.extractAccessToken(req.headers);
      },
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: secret,
    });
  }

  async validate(
    req: {
      headers: Record<string, string | string[] | undefined>;
      sessionJti?: string;
    },
    payload: JwtPayload,
  ): Promise<CurrentUser> {
    if (!payload?.sub || !payload.jti) {
      throw new UnauthorizedException();
    }

    if (await this.tokenBlacklistService.isRevoked(payload.jti)) {
      throw new UnauthorizedException();
    }

    // The current-user cache is shared per user across sessions, so the jti
    // travels on the request instead of the cached CurrentUser object.
    req.sessionJti = payload.jti;

    return this.authService.getCurrentUserById(payload.sub);
  }
}
