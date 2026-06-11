export type LoginDto = {
  email: string;
  password: string;
};

export type ForgotPasswordDto = {
  email: string;
};

export type ForgotPasswordResponse = {
  message: string;
};

export type ResetPasswordDto = {
  token: string;
  password: string;
  passwordConfirmation: string;
};

export type ResetPasswordResponse = {
  message: string;
};

export type ValidateResetPasswordTokenDto = {
  token: string;
};

export type ValidateResetPasswordTokenResponse = {
  valid: boolean;
  reason?: 'invalid' | 'expired' | 'used' | 'user_inactive';
  expiresAt?: string;
};

export type CurrentUserOrganization = {
  id: string;
  name: string;
  slug: string;
  role: string;
  roleId?: string;
  roleName?: string;
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

export type LogoutResponse = {
  success: true;
};

export type AuthCsrfResponse = {
  csrfToken: string;
  headerName: string;
  cookieName: string;
};

export type AuthPermissionsResponse = {
  permissions: string[];
  systemRoles: string[];
  organization: {
    id: string;
    role: string;
  };
};
