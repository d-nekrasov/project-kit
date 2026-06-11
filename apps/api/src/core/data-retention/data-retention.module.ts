import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { SystemLogsModule } from '../system-logs/system-logs.module';
import { DataRetentionService } from './data-retention.service';

@Module({
  imports: [PrismaModule, SystemLogsModule],
  providers: [DataRetentionService],
  exports: [DataRetentionService]
})
export class DataRetentionModule {}
