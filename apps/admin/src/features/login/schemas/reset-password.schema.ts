import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 8;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`),
    passwordConfirmation: z
      .string()
      .min(PASSWORD_MIN_LENGTH, `Password confirmation must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  })
  .refine((values) => values.password === values.passwordConfirmation, {
    message: 'Password confirmation does not match.',
    path: ['passwordConfirmation']
  });

export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
