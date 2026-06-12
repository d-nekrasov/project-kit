import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const SessionJti = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<{ sessionJti?: string }>();
    return request.sessionJti;
  }
);
