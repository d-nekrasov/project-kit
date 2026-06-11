import { CurrentUser } from '../types/current-user.type';

export class AuthResponseDto {
  // accessToken/tokenType присутствуют только при явном bearer-ответе
  // (заголовок X-Auth-Transport: bearer при включённом AUTH_BEARER_ENABLED);
  // в cookie-режиме токен доставляется исключительно HttpOnly-кукой.
  accessToken?: string;
  tokenType?: 'Bearer';
  expiresIn!: string;
  user!: CurrentUser;
}

export class AuthLoginResultDto extends AuthResponseDto {
  declare accessToken: string;
  declare tokenType: 'Bearer';
}
