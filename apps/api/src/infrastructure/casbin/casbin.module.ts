import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CasbinService } from './casbin.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CasbinService],
  exports: [CasbinService]
})
export class CasbinModule {}
