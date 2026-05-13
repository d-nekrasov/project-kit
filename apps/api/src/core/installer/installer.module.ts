import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { RbacSyncModule } from '../rbac-sync/rbac-sync.module';
import { SystemLogsModule } from '../system-logs/system-logs.module';
import { InstallerController } from './installer.controller';
import { InstallerService } from './installer.service';

@Module({
  imports: [CasbinModule, SystemLogsModule, RbacSyncModule],
  controllers: [InstallerController],
  providers: [InstallerService]
})
export class InstallerModule {}
