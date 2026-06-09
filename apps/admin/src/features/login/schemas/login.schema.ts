import { z } from 'zod';

type Translate = (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;

export const createLoginSchema = (t: Translate) =>
  z.object({
    email: z.string().min(1, t('auth.validation.emailRequired')).email(t('auth.validation.emailInvalid')),
    password: z.string().min(1, t('auth.validation.passwordRequired'))
  });

export type LoginForm = z.infer<ReturnType<typeof createLoginSchema>>;
