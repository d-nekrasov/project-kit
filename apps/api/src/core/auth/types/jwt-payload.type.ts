export type JwtPayload = {
  sub: string;
  jti?: string;
  email: string;
  systemRoles: string[];
  organizations: {
    id: string;
    role: string;
  }[];
  iat?: number;
  exp?: number;
};
