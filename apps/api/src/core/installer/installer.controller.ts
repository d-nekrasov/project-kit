import { Body, Controller, Get, Logger, Post, UseGuards } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthRateLimit } from "../auth/decorators/auth-rate-limit.decorator";
import { AuthRateLimitGuard } from "../auth/guards/auth-rate-limit.guard";
import { InstallerService } from "./installer.service";
import { InstallTokenGuard } from "./guards/install-token.guard";
import { SetupInstallerDto } from "./dto/setup-installer.dto";
import { InstallerStatusDto } from "./dto/installer-status.dto";

const INSTALLER_SETUP_RATE_LIMIT = {
  key: "installer-setup",
  limit: 3,
  ttlMs: 15 * 60 * 1000,
};

@Controller("installer")
export class InstallerController {
  private readonly logger = new Logger(InstallerController.name);

  constructor(
    private readonly installerService: InstallerService,
    private readonly configService: ConfigService,
  ) {}

  @Get("status")
  getStatus(): Promise<InstallerStatusDto> {
    return this.installerService.getStatus();
  }

  // Rate-limit стоит перед проверкой токена, чтобы перебор INSTALL_TOKEN
  // упирался в 429 так же, как и попытки установки без токена.
  @Post("setup")
  @UseGuards(AuthRateLimitGuard, InstallTokenGuard)
  @AuthRateLimit(INSTALLER_SETUP_RATE_LIMIT)
  async setup(@Body() dto: SetupInstallerDto) {
    const result = await this.installerService.setup(dto);
    if (this.configService.get<string>("INSTALL_TOKEN")) {
      this.logger.warn(
        "Installation completed. Remove INSTALL_TOKEN from the environment and restart the API.",
      );
    }
    return result;
  }
}
