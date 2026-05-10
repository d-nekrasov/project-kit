import { Body, Controller, Get, Post } from '@nestjs/common';
import { InstallerService } from './installer.service';
import { SetupInstallerDto } from './dto/setup-installer.dto';
import { InstallerStatusDto } from './dto/installer-status.dto';

@Controller('installer')
export class InstallerController {
  constructor(private readonly installerService: InstallerService) {}

  @Get('status')
  getStatus(): Promise<InstallerStatusDto> {
    return this.installerService.getStatus();
  }

  @Post('setup')
  setup(@Body() dto: SetupInstallerDto) {
    return this.installerService.setup(dto);
  }
}
