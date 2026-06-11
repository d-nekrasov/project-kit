import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { getRequestMetadata } from "../../../common/utils/request-metadata.util";
import {
  AUTH_RATE_LIMIT_OPTIONS,
  AuthRateLimitOptions,
} from "../decorators/auth-rate-limit.decorator";
import { RATE_LIMIT_STORE, type RateLimitStore } from "../auth-rate-limit.store";

type RequestLike = {
  headers: Record<string, string | string[] | undefined>;
  ip?: string | null;
};

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(RATE_LIMIT_STORE)
    private readonly authRateLimitStore: RateLimitStore,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<AuthRateLimitOptions>(
      AUTH_RATE_LIMIT_OPTIONS,
      [context.getHandler(), context.getClass()],
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestLike>();
    const ip = getRequestMetadata(request).ip ?? "unknown";
    const key = `project-kit:rate-limit:${options.key}:${ip}`;
    const count = await this.authRateLimitStore.increment(
      key,
      options.ttlMs,
    );

    if (count > options.limit) {
      throw new HttpException(
        "Too many requests. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
