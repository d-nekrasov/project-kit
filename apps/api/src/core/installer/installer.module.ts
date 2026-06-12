import { Logger, Module, OnApplicationBootstrap } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CasbinModule } from "../../infrastructure/casbin/casbin.module";
import { AuthRateLimitModule } from "../auth/auth-rate-limit.module";
import { AuthRateLimitGuard } from "../auth/guards/auth-rate-limit.guard";
import { RbacSyncModule } from "../rbac-sync/rbac-sync.module";
import { SystemLogsModule } from "../system-logs/system-logs.module";
import { InstallerController } from "./installer.controller";
import { InstallerService } from "./installer.service";
import { InstallTokenGuard } from "./guards/install-token.guard";

@Module({
  imports: [CasbinModule, SystemLogsModule, RbacSyncModule, AuthRateLimitModule],
  controllers: [InstallerController],
  providers: [InstallerService, AuthRateLimitGuard, InstallTokenGuard]
})
export class InstallerModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(InstallerModule.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly installerService: InstallerService
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // В production отсутствие INSTALL_TOKEN не блокирует старт (иначе нельзя поднять
    // уже установленную систему без переменной) — setup просто отвечает 403.
    const appEnv = (this.configService.get<string>("APP_ENV") ?? "development").toLowerCase();
    if (appEnv === "production" || this.configService.get<string>("INSTALL_TOKEN")) {
      return;
    }

    const { installed } = await this.installerService.getStatus();
    if (!installed) {
      this.logger.warn(
        "System is not installed and INSTALL_TOKEN is not set: POST /api/installer/setup " +
          "is open to anyone who can reach the API. Set INSTALL_TOKEN to protect the " +
          "installation window (required in production)."
      );
    }
  }
}
