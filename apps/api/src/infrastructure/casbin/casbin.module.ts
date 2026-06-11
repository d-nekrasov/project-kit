import { Module, forwardRef } from '@nestjs/common';
import { SystemLogsModule } from '../../core/system-logs/system-logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CasbinPolicyWatcher } from './casbin-watcher';
import { CasbinService } from './casbin.service';

@Module({
  imports: [PrismaModule, forwardRef(() => SystemLogsModule)],
  providers: [CasbinService, CasbinPolicyWatcher],
  exports: [CasbinService]
})
export class CasbinModule {}
