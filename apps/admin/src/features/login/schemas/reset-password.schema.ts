import { z } from 'zod';

const PASSWORD_MIN_LENGTH = 8;

type Translate = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

export const createResetPasswordSchema = (t: Translate) =>
  z
    .object({
      password: z
        .string()
        .min(1, t('auth.validation.passwordRequired'))
        .min(PASSWORD_MIN_LENGTH, t('auth.validation.passwordMin', { count: PASSWORD_MIN_LENGTH })),
      passwordConfirmation: z
        .string()
        .min(1, t('auth.validation.passwordConfirmationRequired'))
        .min(
          PASSWORD_MIN_LENGTH,
          t('auth.validation.passwordConfirmationMin', { count: PASSWORD_MIN_LENGTH })
        )
    })
    .refine((values) => values.password === values.passwordConfirmation, {
      message: t('auth.validation.passwordConfirmationMismatch'),
      path: ['passwordConfirmation']
    });

export type ResetPasswordForm = z.infer<ReturnType<typeof createResetPasswordSchema>>;
