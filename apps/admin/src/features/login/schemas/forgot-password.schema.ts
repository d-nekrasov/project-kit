import { z } from 'zod';

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email address.')
});

export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
