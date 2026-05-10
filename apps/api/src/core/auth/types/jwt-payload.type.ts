export type JwtPayload = {
  sub: string;
  email: string;
  systemRoles: string[];
  organizations: {
    id: string;
    role: string;
  }[];
};
