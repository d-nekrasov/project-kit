import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { SystemLogsModule } from '../system-logs/system-logs.module';
import { RbacSyncService } from './rbac-sync.service';

@Module({
  imports: [PrismaModule, CasbinModule, SystemLogsModule],
  providers: [RbacSyncService],
  exports: [RbacSyncService]
})
export class RbacSyncModule {}
