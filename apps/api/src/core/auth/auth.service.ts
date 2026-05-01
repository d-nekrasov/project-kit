import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OrganizationStatus, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './types/current-user.type';
import { JwtPayload } from './types/jwt-payload.type';

const INVALID_CREDENTIALS_MESSAGE = 'Invalid email or password';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService
  ) {}

  // TODO: Add rate limiting for login endpoint.
  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true, passwordHash: true }
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
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
        role: organization.role
      }))
    };
    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
      user: currentUser
    };
  }

  async getCurrentUserById(userId: string): Promise<CurrentUser> {
    return this.buildCurrentUser(userId);
  }

  private async buildCurrentUser(userId: string): Promise<CurrentUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        systemRoles: {
          include: { role: true }
        },
        memberships: {
          include: {
            role: true,
            organization: true
          }
        }
      }
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      systemRoles: user.systemRoles.map((userSystemRole) => userSystemRole.role.code),
      organizations: user.memberships
        .filter(
          (membership) =>
            membership.status === UserStatus.ACTIVE &&
            membership.organization.status === OrganizationStatus.ACTIVE
        )
        .map((membership) => ({
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          role: membership.role.code
        }))
    };
  }
}
