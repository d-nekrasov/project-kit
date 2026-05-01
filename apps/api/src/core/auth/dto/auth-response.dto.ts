import { CurrentUser } from '../types/current-user.type';

export class AuthResponseDto {
  accessToken!: string;
  tokenType!: 'Bearer';
  expiresIn!: string;
  user!: CurrentUser;
}
