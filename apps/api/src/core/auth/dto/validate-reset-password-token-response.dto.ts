export class ValidateResetPasswordTokenResponseDto {
  valid!: boolean;
  reason?: "invalid" | "expired" | "used" | "user_inactive";
  expiresAt?: string;
}
