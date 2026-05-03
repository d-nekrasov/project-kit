import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    CasbinModule,
    PermissionsModule,
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('AuthModule');
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m';
        const appEnv = (configService.get<string>('APP_ENV') ?? 'development').toLowerCase();
        const isProd = appEnv === 'production';

        if (!secret) {
          throw new Error('JWT_SECRET is required');
        }
        if (isProd && secret === 'change_me') {
          throw new Error('JWT_SECRET must be changed in production');
        }
        if (!isProd && secret === 'change_me') {
          logger.warn('JWT_SECRET is set to insecure default value "change_me".');
        }

        return {
          secret,
          signOptions: { expiresIn: expiresIn as any }
        };
      }
    })
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService]
})
export class AuthModule {}
