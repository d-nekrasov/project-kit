import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { InstallerController } from './installer.controller';
import { InstallerService } from './installer.service';

@Module({
  imports: [CasbinModule],
  controllers: [InstallerController],
  providers: [InstallerService]
})
export class InstallerModule {}
