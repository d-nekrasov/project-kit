import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { getRequestMetadata } from "../../../common/utils/request-metadata.util";
import {
  AUTH_RATE_LIMIT_OPTIONS,
  AuthRateLimitOptions,
} from "../decorators/auth-rate-limit.decorator";
import { AuthRateLimitStore } from "../auth-rate-limit.store";

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string | null;
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authRateLimitStore: AuthRateLimitStore,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<AuthRateLimitOptions>(
      AUTH_RATE_LIMIT_OPTIONS,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestLike>();
    const ip = getRequestMetadata(request).ip ?? "unknown";
    const key = `${options.key}:${ip}`;
    const allowed = this.authRateLimitStore.consume(
      key,
      options.limit,
      options.ttlMs,
    );

    if (!allowed) {
      throw new HttpException(
        "Too many requests. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
