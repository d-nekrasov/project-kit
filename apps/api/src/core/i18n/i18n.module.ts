import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { I18nController } from './i18n.controller';
import { I18nLoaderService } from './i18n-loader.service';
import { I18nService } from './i18n.service';

@Module({
  imports: [PrismaModule],
  controllers: [I18nController],
  providers: [I18nLoaderService, I18nService],
  exports: [I18nLoaderService, I18nService]
})
export class I18nModule {}
