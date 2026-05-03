import { Module, forwardRef } from '@nestjs/common';
import { SystemLogsModule } from '../../core/system-logs/system-logs.module';
import { PrismaModule } from '../prisma/prisma.module';
import { CasbinService } from './casbin.service';

@Module({
  imports: [PrismaModule, forwardRef(() => SystemLogsModule)],
  providers: [CasbinService],
  exports: [CasbinService]
})
export class CasbinModule {}
