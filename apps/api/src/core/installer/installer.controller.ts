import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { AuthRateLimit } from "../auth/decorators/auth-rate-limit.decorator";
import { AuthRateLimitGuard } from "../auth/guards/auth-rate-limit.guard";
import { InstallerService } from "./installer.service";
import { SetupInstallerDto } from "./dto/setup-installer.dto";
import { InstallerStatusDto } from "./dto/installer-status.dto";

const INSTALLER_SETUP_RATE_LIMIT = {
  key: "installer-setup",
  limit: 3,
  ttlMs: 15 * 60 * 1000,
};

@Controller("installer")
export class InstallerController {
  constructor(private readonly installerService: InstallerService) {}

  @Get("status")
  getStatus(): Promise<InstallerStatusDto> {
    return this.installerService.getStatus();
  }

  @Post("setup")
  @UseGuards(AuthRateLimitGuard)
  @AuthRateLimit(INSTALLER_SETUP_RATE_LIMIT)
  setup(@Body() dto: SetupInstallerDto) {
    return this.installerService.setup(dto);
  }
}
