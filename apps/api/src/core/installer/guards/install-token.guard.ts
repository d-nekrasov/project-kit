import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { timingSafeStringEqual } from "../../auth/utils/timing-safe-compare.util";
import { InstallerService } from "../installer.service";

export const INSTALL_TOKEN_HEADER = "x-install-token";

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
};

/**
 * Закрывает «окно установки»: пока система не установлена, POST /installer/setup
 * доступен любому, кто дотягивается до API. Токен из env INSTALL_TOKEN передаётся
 * клиентом в заголовке X-Install-Token (заголовок, а не поле dto, чтобы секрет
 * не попадал в публичные типы SDK и тела запросов).
 */
@Injectable()
export class InstallTokenGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly installerService: InstallerService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // После установки setup отвечает 409 независимо от токена — пропускаем к сервису.
    const { installed } = await this.installerService.getStatus();
    if (installed) {
      return true;
    }

    const configuredToken = this.configService.get<string>("INSTALL_TOKEN");
    if (!configuredToken) {
      const appEnv = (
        this.configService.get<string>("APP_ENV") ?? "development"
      ).toLowerCase();
      if (appEnv === "production") {
        throw new ForbiddenException("Set INSTALL_TOKEN to enable installation");
      }
      return true;
    }

    const headerValue =
      context.switchToHttp().getRequest<RequestLike>().headers[INSTALL_TOKEN_HEADER];
    const providedToken = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    // Неверный и отсутствующий токен дают одинаковый ответ без уточнения причины.
    if (!providedToken || !timingSafeStringEqual(providedToken, configuredToken)) {
      throw new ForbiddenException();
    }

    return true;
  }
}
