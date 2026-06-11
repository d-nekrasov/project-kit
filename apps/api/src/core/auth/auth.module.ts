import { Logger, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigEncryptionModule } from "../../common/security/config-encryption.module";
import { CasbinModule } from "../../infrastructure/casbin/casbin.module";
import { PrismaModule } from "../../infrastructure/prisma/prisma.module";
import { RedisModule } from "../../infrastructure/redis/redis.module";
import { RedisService } from "../../infrastructure/redis/redis.service";
import { PermissionsModule } from "../permissions/permissions.module";
import { AuditLogsModule } from "../audit-logs/audit-logs.module";
import { SystemLogsModule } from "../system-logs/system-logs.module";
import { EmailSmtpNotificationConnector } from "../notifications/connectors/email-smtp-notification.connector";
import { AuthRateLimitModule } from "./auth-rate-limit.module";
import { AuthPasswordResetMailService } from "./auth-password-reset-mail.service";
import { AuthController } from "./auth.controller";
import { AuthCookieService } from "./auth-cookie.service";
import { AuthCsrfService } from "./auth-csrf.service";
import { AuthService } from "./auth.service";
import { AuthTransportService } from "./auth-transport.service";
import { AuthRateLimitGuard } from "./guards/auth-rate-limit.guard";
import { selectTokenBlacklistStore } from "./select-token-blacklist-store";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { InMemoryTokenBlacklistStore } from "./stores/in-memory-token-blacklist.store";
import { RedisTokenBlacklistStore } from "./stores/redis-token-blacklist.store";
import { TOKEN_BLACKLIST_STORE } from "./stores/token-blacklist-store.interface";
import { TokenBlacklistService } from "./token-blacklist.service";

@Module({
  imports: [
    ConfigEncryptionModule,
    PrismaModule,
    CasbinModule,
    RedisModule,
    PermissionsModule,
    AuditLogsModule,
    SystemLogsModule,
    AuthRateLimitModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger("AuthModule");
        const secret = configService.get<string>("JWT_SECRET");
        const expiresIn =
          configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m";
        const appEnv = (
          configService.get<string>("APP_ENV") ?? "development"
        ).toLowerCase();
        const isProd = appEnv === "production";

        if (!secret) {
          throw new Error("JWT_SECRET is required");
        }
        if (isProd && secret === "change_me") {
          throw new Error("JWT_SECRET must be changed in production");
        }
        if (!isProd && secret === "change_me") {
          logger.warn(
            'JWT_SECRET is set to insecure default value "change_me".',
          );
        }

        return {
          secret,
          signOptions: { expiresIn: expiresIn as any },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthCookieService,
    AuthCsrfService,
    AuthTransportService,
    JwtStrategy,
    AuthPasswordResetMailService,
    EmailSmtpNotificationConnector,
    InMemoryTokenBlacklistStore,
    RedisTokenBlacklistStore,
    {
      provide: TOKEN_BLACKLIST_STORE,
      inject: [
        ConfigService,
        RedisService,
        InMemoryTokenBlacklistStore,
        RedisTokenBlacklistStore,
      ],
      useFactory: (
        configService: ConfigService,
        redisService: RedisService,
        inMemoryStore: InMemoryTokenBlacklistStore,
        redisStore: RedisTokenBlacklistStore,
      ) =>
        selectTokenBlacklistStore(
          configService,
          redisService,
          inMemoryStore,
          redisStore,
        ),
    },
    TokenBlacklistService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
