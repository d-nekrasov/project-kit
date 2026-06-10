import { Module } from "@nestjs/common";
import { CasbinModule } from "../../infrastructure/casbin/casbin.module";
import { AuthRateLimitModule } from "../auth/auth-rate-limit.module";
import { AuthRateLimitGuard } from "../auth/guards/auth-rate-limit.guard";
import { RbacSyncModule } from "../rbac-sync/rbac-sync.module";
import { SystemLogsModule } from "../system-logs/system-logs.module";
import { InstallerController } from "./installer.controller";
import { InstallerService } from "./installer.service";

@Module({
  imports: [CasbinModule, SystemLogsModule, RbacSyncModule, AuthRateLimitModule],
  controllers: [InstallerController],
  providers: [InstallerService, AuthRateLimitGuard]
})
export class InstallerModule {}
