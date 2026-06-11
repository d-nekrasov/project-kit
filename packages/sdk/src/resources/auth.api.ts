import type { ApiClient } from '../client/api-client';
import type {
  AuthCsrfResponse,
  AuthPermissionsResponse,
  AuthResponse,
  CurrentUser,
  ForgotPasswordDto,
  ForgotPasswordResponse,
  LoginDto,
  LogoutResponse,
  ResetPasswordDto,
  ResetPasswordResponse,
  ValidateResetPasswordTokenDto,
  ValidateResetPasswordTokenResponse
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

  validateResetPasswordToken(dto: ValidateResetPasswordTokenDto): Promise<ValidateResetPasswordTokenResponse> {
    return this.client.post<ValidateResetPasswordTokenResponse>('/auth/reset-password/validate', dto, {
      skipAuth: true,
      skipOrganization: true
    });
  }

  me(): Promise<CurrentUser> {
    return this.client.get<CurrentUser>('/auth/me');
  }

  csrf(): Promise<AuthCsrfResponse> {
    return this.client.get<AuthCsrfResponse>('/auth/csrf', {
      skipAuth: true,
      skipOrganization: true,
      skipCsrf: true
    });
  }

  logout(): Promise<LogoutResponse> {
    return this.client.post<LogoutResponse>('/auth/logout');
  }

  permissions(): Promise<AuthPermissionsResponse> {
    return this.client.get<AuthPermissionsResponse>('/auth/permissions');
  }
}
