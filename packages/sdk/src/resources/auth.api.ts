import type { ApiClient } from '../client/api-client';
import type {
  AuthContextResponse,
  AuthPermissionsResponse,
  AuthResponse,
  CurrentUser,
  ForgotPasswordDto,
  ForgotPasswordResponse,
  LoginDto,
  PermissionsCheckResponse,
  ResetPasswordDto,
  ResetPasswordResponse
} from '../types/auth.types';

export class AuthApi {
  constructor(private readonly client: ApiClient) {}

  login(dto: LoginDto): Promise<AuthResponse> {
    return this.client.post<AuthResponse>('/auth/login', dto, {
      skipAuth: true,
      skipOrganization: true
    });
  }

  forgotPassword(dto: ForgotPasswordDto): Promise<ForgotPasswordResponse> {
    return this.client.post<ForgotPasswordResponse>('/auth/forgot-password', dto, {
      skipAuth: true,
      skipOrganization: true
    });
  }

  resetPassword(dto: ResetPasswordDto): Promise<ResetPasswordResponse> {
    return this.client.post<ResetPasswordResponse>('/auth/reset-password', dto, {
      skipAuth: true,
      skipOrganization: true
    });
  }

  me(): Promise<CurrentUser> {
    return this.client.get<CurrentUser>('/auth/me');
  }

  permissions(): Promise<AuthPermissionsResponse> {
    return this.client.get<AuthPermissionsResponse>('/auth/permissions');
  }

  // TODO: remove when diagnostics module is introduced.
  context(): Promise<AuthContextResponse> {
    return this.client.get<AuthContextResponse>('/auth/context');
  }

  // TODO: remove when diagnostics module is introduced.
  permissionsCheck(): Promise<PermissionsCheckResponse> {
    return this.client.get<PermissionsCheckResponse>('/auth/permissions-check');
  }
}
