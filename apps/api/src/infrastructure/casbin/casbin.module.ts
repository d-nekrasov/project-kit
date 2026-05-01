import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CasbinService } from './casbin.service';

@Module({
  imports: [PrismaModule],
  providers: [CasbinService],
  exports: [CasbinService]
})
export class CasbinModule {}
