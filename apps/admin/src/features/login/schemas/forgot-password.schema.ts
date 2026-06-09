import { z } from 'zod';

type Translate = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

export const createForgotPasswordSchema = (t: Translate) =>
  z.object({
    email: z.string().min(1, t('auth.validation.emailRequired')).email(t('auth.validation.emailInvalid'))
  });

export type ForgotPasswordForm = z.infer<ReturnType<typeof createForgotPasswordSchema>>;
