export type LoginDto = {
  email: string;
  password: string;
};

export type CurrentUserOrganization = {
  id: string;
  name: string;
  slug: string;
  role: string;
};

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
  systemRoles: string[];
  organizations: CurrentUserOrganization[];
};

export type AuthResponse = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresIn: string;
  user: CurrentUser;
};

export type AuthContextResponse = {
  userId: string;
  organization: {
    id: string;
    slug: string;
    role: string;
  };
};

export type PermissionsCheckResponse = {
  allowed: boolean;
  permission: string;
};

export type AuthPermissionsResponse = {
  permissions: string[];
  systemRoles: string[];
  organization: {
    id: string;
    role: string;
  };
};
