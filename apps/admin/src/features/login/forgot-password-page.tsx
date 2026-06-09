import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate } from 'react-router-dom';

import { ErrorState } from '@/components/common/error-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/use-auth';
import { AuthCard } from '@/features/login/components/auth-card';
import { getRecoveryErrorMessage } from '@/features/login/recovery-error-message';
import { createForgotPasswordSchema, type ForgotPasswordForm } from '@/features/login/schemas/forgot-password.schema';
import { useI18n } from '@/lib/i18n/use-i18n';
import { sdk } from '@/lib/sdk';

export function ForgotPasswordPage() {
  const auth = useAuth();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const schema = useMemo(() => createForgotPasswordSchema(t), [t]);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: ''
    }
  });

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthCard title={t('auth.forgotPassword.title')} description={t('auth.forgotPassword.description')}>
      {isSubmitted ? (
        <div className="space-y-4">
          <Alert>
            <AlertTitle>{t('auth.forgotPassword.successTitle')}</AlertTitle>
            <AlertDescription>{t('auth.forgotPassword.successMessage')}</AlertDescription>
          </Alert>
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            to="/login"
          >
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      ) : (
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              setError(null);
              try {
                await sdk.auth.forgotPassword(values);
                setIsSubmitted(true);
              } catch (nextError) {
                setError(getRecoveryErrorMessage(nextError, t));
              }
            })}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.forgotPassword.emailLabel')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="email" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error ? <ErrorState message={error} /> : null}

            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t('auth.forgotPassword.submitting') : t('auth.forgotPassword.submit')}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Link className="transition-colors hover:text-foreground" to="/login">
                {t('auth.forgotPassword.backToLogin')}
              </Link>
            </div>
          </form>
        </Form>
      )}
    </AuthCard>
  );
}
