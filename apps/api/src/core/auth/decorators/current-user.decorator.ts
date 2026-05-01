import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CurrentUser } from '../types/current-user.type';

export const CurrentUserDecorator = createParamDecorator(
  (field: keyof CurrentUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<{ user?: CurrentUser }>();
    const user = request.user;

    if (!field) {
      return user;
    }
    return user?.[field];
  }
);

export { CurrentUserDecorator as CurrentUser };
