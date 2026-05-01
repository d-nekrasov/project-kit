import { CurrentUser } from '../types/current-user.type';

export class MeResponseDto implements CurrentUser {
  id!: string;
  email!: string;
  name!: string | null;
  systemRoles!: string[];
  organizations!: {
    id: string;
    name: string;
    slug: string;
    role: string;
  }[];
}
