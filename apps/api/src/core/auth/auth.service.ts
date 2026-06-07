import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { OrganizationStatus, UserStatus } from "@prisma/client";
import * as argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { RequestMetadata } from "../../common/utils/request-metadata.util";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
} from "../audit-logs/constants/audit-actions.constants";
import { AuthPasswordResetMailService } from "./auth-password-reset-mail.service";
import { AuthMessageResponseDto } from "./dto/auth-message-response.dto";
import { AuthResponseDto } from "./dto/auth-response.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ValidateResetPasswordTokenDto } from "./dto/validate-reset-password-token.dto";
import { ValidateResetPasswordTokenResponseDto } from "./dto/validate-reset-password-token-response.dto";
import { CurrentUser } from "./types/current-user.type";
import { JwtPayload } from "./types/jwt-payload.type";
import { CurrentOrganization } from "../organization-context/types/current-organization.type";

const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password";
const PASSWORD_RESET_RESPONSE_MESSAGE =
  "If an account exists for that email, password reset instructions will be sent.";
const PASSWORD_RESET_INVALID_TOKEN_MESSAGE =
  "Password reset token is invalid or expired";
const DEFAULT_PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;
type PasswordResetTokenValidationReason =
  | "invalid"
  | "expired"
  | "used"
  | "user_inactive";
type PasswordResetTokenRecord = {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  user: {
    status: UserStatus;
  };
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditLogsService: AuditLogsService,
    private readonly authPasswordResetMailService: AuthPasswordResetMailService,
  ) {}

  // TODO: Add rate limiting for login endpoint.
  async login(
    dto: LoginDto,
    requestMetadata?: RequestMetadata,
  ): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true, passwordHash: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const currentUser = await this.buildCurrentUser(user.id);
    const payload: JwtPayload = {
      sub: currentUser.id,
      email: currentUser.email,
      systemRoles: currentUser.systemRoles,
      organizations: currentUser.organizations.map((organization) => ({
        id: organization.id,
        role: organization.role,
      })),
    };
    const accessToken = await this.jwtService.signAsync(payload);
    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.AUTH_LOGIN,
      entityType: AUDIT_ENTITY_TYPES.AUTH,
      entityId: user.id,
      userId: user.id,
      organizationId: null,
      metadata: { email: currentUser.email },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent,
    });

    return {
      accessToken,
      tokenType: "Bearer",
      expiresIn:
        this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m",
      user: currentUser,
    };
  }

  async getCurrentUserById(userId: string): Promise<CurrentUser> {
    return this.buildCurrentUser(userId);
  }

  // TODO: Add rate limiting for forgot-password endpoint.
  async forgotPassword(
    dto: ForgotPasswordDto,
    requestMetadata?: RequestMetadata,
  ): Promise<AuthMessageResponseDto> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true },
    });

    let emailDelivered = false;

    if (user?.status === UserStatus.ACTIVE) {
      const rawToken = this.generatePasswordResetToken();
      const now = new Date();
      const expiresAt = new Date(
        now.getTime() + this.getPasswordResetTokenTtlMinutes() * 60 * 1000,
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.passwordResetToken.updateMany({
          where: {
            userId: user.id,
            usedAt: null,
          },
          data: {
            usedAt: now,
          },
        });

        await tx.passwordResetToken.create({
          data: {
            userId: user.id,
            tokenHash: this.hashPasswordResetToken(rawToken),
            expiresAt,
            requestIp: requestMetadata?.ip ?? null,
            requestUserAgent: requestMetadata?.userAgent ?? null,
          },
        });
      });

      const result =
        await this.authPasswordResetMailService.sendPasswordResetEmail({
          userId: user.id,
          email: user.email,
          token: rawToken,
          expiresAt,
        });
      emailDelivered = result.delivered;
    }

    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET_REQUESTED,
      entityType: AUDIT_ENTITY_TYPES.AUTH,
      entityId: user?.id ?? null,
      userId: user?.id ?? null,
      organizationId: null,
      metadata: {
        userFound: Boolean(user),
        userStatus: user?.status ?? null,
        emailDelivered,
      },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent,
    });

    return { message: PASSWORD_RESET_RESPONSE_MESSAGE };
  }

  async resetPassword(
    dto: ResetPasswordDto,
    requestMetadata?: RequestMetadata,
  ): Promise<AuthMessageResponseDto> {
    const passwordResetToken = await this.findPasswordResetToken(dto.token);
    const now = new Date();
    const validationReason = this.resolvePasswordResetValidationReason(
      passwordResetToken,
      now,
    );

    if (validationReason) {
      await this.auditLogsService.write({
        action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET_FAILED,
        entityType: AUDIT_ENTITY_TYPES.AUTH,
        entityId: passwordResetToken?.userId ?? null,
        userId: passwordResetToken?.userId ?? null,
        organizationId: null,
        metadata: {
          reason: this.mapPasswordResetValidationReasonToAuditReason(
            validationReason,
          ),
        },
        ip: requestMetadata?.ip,
        userAgent: requestMetadata?.userAgent,
      });
      throw new BadRequestException(PASSWORD_RESET_INVALID_TOKEN_MESSAGE);
    }

    const activePasswordResetToken = passwordResetToken!;
    const passwordHash = await argon2.hash(dto.password);

    try {
      await this.prisma.$transaction(async (tx) => {
        const useResult = await tx.passwordResetToken.updateMany({
          where: {
            id: activePasswordResetToken.id,
            userId: activePasswordResetToken.userId,
            usedAt: null,
            expiresAt: { gt: now },
          },
          data: {
            usedAt: now,
            usedIp: requestMetadata?.ip ?? null,
            usedUserAgent: requestMetadata?.userAgent ?? null,
          },
        });

        if (useResult.count !== 1) {
          throw new BadRequestException(PASSWORD_RESET_INVALID_TOKEN_MESSAGE);
        }

        const passwordUpdateResult = await tx.user.updateMany({
          where: {
            id: activePasswordResetToken.userId,
            status: UserStatus.ACTIVE,
          },
          data: {
            passwordHash,
          },
        });

        if (passwordUpdateResult.count !== 1) {
          throw new BadRequestException(PASSWORD_RESET_INVALID_TOKEN_MESSAGE);
        }

        await tx.passwordResetToken.updateMany({
          where: {
            userId: activePasswordResetToken.userId,
            usedAt: null,
          },
          data: {
            usedAt: now,
          },
        });
      });
    } catch (error) {
      if (error instanceof BadRequestException) {
        await this.auditLogsService.write({
          action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET_FAILED,
          entityType: AUDIT_ENTITY_TYPES.AUTH,
          entityId: activePasswordResetToken.userId,
          userId: activePasswordResetToken.userId,
          organizationId: null,
          metadata: {
            reason: "token_rejected_during_reset",
          },
          ip: requestMetadata?.ip,
          userAgent: requestMetadata?.userAgent,
        });
      }
      throw error;
    }

    await this.auditLogsService.write({
      action: AUDIT_ACTIONS.AUTH_PASSWORD_RESET_COMPLETED,
      entityType: AUDIT_ENTITY_TYPES.AUTH,
      entityId: activePasswordResetToken.userId,
      userId: activePasswordResetToken.userId,
      organizationId: null,
      metadata: {
        completedAt: now.toISOString(),
      },
      ip: requestMetadata?.ip,
      userAgent: requestMetadata?.userAgent,
    });

    return {
      message: "Password has been reset successfully.",
    };
  }

  async validateResetPasswordToken(
    dto: ValidateResetPasswordTokenDto,
  ): Promise<ValidateResetPasswordTokenResponseDto> {
    const token = dto.token.trim();
    if (!token) {
      throw new BadRequestException("Password reset token is required");
    }

    const passwordResetToken = await this.findPasswordResetToken(token);
    return this.validatePasswordResetTokenRecord(
      passwordResetToken,
      new Date(),
    );
  }

  async getEffectivePermissions(
    currentUser: CurrentUser,
    currentOrganization: CurrentOrganization,
  ): Promise<{
    permissions: string[];
    systemRoles: string[];
    organization: { id: string; role: string };
  }> {
    if (currentUser.systemRoles.includes("super_admin")) {
      const permissions = await this.prisma.permission.findMany({
        select: { code: true },
        orderBy: { code: "asc" },
      });

      return {
        permissions: permissions.map((permission) => permission.code),
        systemRoles: currentUser.systemRoles,
        organization: {
          id: currentOrganization.id,
          role: currentOrganization.role,
        },
      };
    }

    const membership = await this.prisma.userOrganization.findFirst({
      where: {
        userId: currentUser.id,
        organizationId: currentOrganization.id,
        status: UserStatus.ACTIVE,
        user: { status: UserStatus.ACTIVE },
        organization: { status: OrganizationStatus.ACTIVE },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "You do not have access to this organization",
      );
    }

    return {
      permissions: membership.role.permissions
        .map((rolePermission) => rolePermission.permission.code)
        .sort((a, b) => a.localeCompare(b)),
      systemRoles: currentUser.systemRoles,
      organization: {
        id: currentOrganization.id,
        role: membership.role.code,
      },
    };
  }

  private async buildCurrentUser(userId: string): Promise<CurrentUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        systemRoles: {
          include: { role: true },
        },
        memberships: {
          include: {
            role: true,
            organization: true,
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      systemRoles: user.systemRoles.map(
        (userSystemRole) => userSystemRole.role.code,
      ),
      organizations: user.memberships
        .filter(
          (membership) =>
            membership.status === UserStatus.ACTIVE &&
            membership.organization.status === OrganizationStatus.ACTIVE,
        )
        .map((membership) => ({
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          role: membership.role.code,
        })),
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private getPasswordResetTokenTtlMinutes(): number {
    const value = this.configService.get<string>(
      "AUTH_PASSWORD_RESET_TOKEN_TTL_MINUTES",
    );
    const parsedValue = Number.parseInt(value ?? "", 10);
    if (Number.isNaN(parsedValue) || parsedValue <= 0) {
      return DEFAULT_PASSWORD_RESET_TOKEN_TTL_MINUTES;
    }
    return parsedValue;
  }

  private generatePasswordResetToken(): string {
    return randomBytes(32).toString("base64url");
  }

  private hashPasswordResetToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
  }

  private async findPasswordResetToken(
    token: string,
  ): Promise<PasswordResetTokenRecord | null> {
    return this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash: this.hashPasswordResetToken(token),
      },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
        usedAt: true,
        user: {
          select: {
            status: true,
          },
        },
      },
    });
  }

  private validatePasswordResetTokenRecord(
    passwordResetToken: PasswordResetTokenRecord | null,
    now: Date,
  ): ValidateResetPasswordTokenResponseDto {
    const reason = this.resolvePasswordResetValidationReason(
      passwordResetToken,
      now,
    );

    if (reason) {
      return {
        valid: false,
        reason,
      };
    }

    return {
      valid: true,
      expiresAt: passwordResetToken!.expiresAt.toISOString(),
    };
  }

  private resolvePasswordResetValidationReason(
    passwordResetToken: PasswordResetTokenRecord | null,
    now: Date,
  ): PasswordResetTokenValidationReason | null {
    if (!passwordResetToken) {
      return "invalid";
    }
    if (passwordResetToken.usedAt) {
      return "used";
    }
    if (passwordResetToken.expiresAt <= now) {
      return "expired";
    }
    if (passwordResetToken.user.status !== UserStatus.ACTIVE) {
      return "user_inactive";
    }
    return null;
  }

  private mapPasswordResetValidationReasonToAuditReason(
    reason: PasswordResetTokenValidationReason,
  ): string {
    if (reason === "invalid") {
      return "token_not_found";
    }
    if (reason === "used") {
      return "token_already_used";
    }
    if (reason === "expired") {
      return "token_expired";
    }
    if (reason === "user_inactive") {
      return "user_not_active";
    }
    return "token_invalid";
  }
}
