import { Module, forwardRef } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { PermissionsGuard } from '../permissions/guards/permissions.guard';
import { SystemLogsController } from './system-logs.controller';
import { SystemLogsService } from './system-logs.service';

@Module({
  imports: [PrismaModule, forwardRef(() => CasbinModule)],
  controllers: [SystemLogsController],
  providers: [SystemLogsService, PermissionsGuard],
  exports: [SystemLogsService]
})
export class SystemLogsModule {}
