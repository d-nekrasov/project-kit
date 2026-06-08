import { Controller, Get } from '@nestjs/common';
import { I18nCatalogResponse, I18nService } from './i18n.service';

@Controller('i18n')
export class I18nController {
  constructor(private readonly i18nService: I18nService) {}

  @Get('catalog')
  getCatalog(): Promise<I18nCatalogResponse> {
    return this.i18nService.getCatalog();
  }
}
