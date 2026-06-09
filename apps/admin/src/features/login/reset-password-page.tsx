import { ApiError } from '@project-kit/sdk';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useSearchParams } from 'react-router-dom';

import { ErrorState } from '@/components/common/error-state';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/use-auth';
import { AuthCard } from '@/features/login/components/auth-card';
import { getRecoveryErrorMessage } from '@/features/login/recovery-error-message';
import { createResetPasswordSchema, type ResetPasswordForm } from '@/features/login/schemas/reset-password.schema';
import { useI18n } from '@/lib/i18n/use-i18n';
import { sdk } from '@/lib/sdk';

function getResetPasswordTokenErrorMessage(
  t: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string,
  reason: 'invalid' | 'expired' | 'used' | 'user_inactive'
): string {
  if (reason === 'expired') {
    return t('auth.resetPassword.tokenExpired');
  }

  if (reason === 'used') {
    return t('auth.resetPassword.tokenUsed');
  }

  if (reason === 'user_inactive') {
    return t('auth.resetPassword.tokenUserInactive');
  }

  return t('auth.resetPassword.tokenInvalid');
}

export function ResetPasswordPage() {
  const auth = useAuth();
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValidationError, setTokenValidationError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const schema = useMemo(() => createResetPasswordSchema(t), [t]);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      password: '',
      passwordConfirmation: ''
    }
  });

  useEffect(() => {
    if (!token) {
      setIsValidatingToken(false);
      setIsTokenValid(false);
      setTokenValidationError(null);
      return;
    }

    let isActive = true;

    setIsValidatingToken(true);
    setIsTokenValid(false);
    setTokenValidationError(null);

    void sdk.auth
      .validateResetPasswordToken({ token })
      .then((response) => {
        if (!isActive) {
          return;
        }

        if (!response.valid) {
          setIsTokenValid(false);
          setTokenValidationError(getResetPasswordTokenErrorMessage(t, response.reason ?? 'invalid'));
          return;
        }

        setIsTokenValid(true);
      })
      .catch((nextError) => {
        if (!isActive) {
          return;
        }

        setIsTokenValid(false);

        if (nextError instanceof ApiError && nextError.status === 0) {
          setTokenValidationError(import.meta.env.DEV ? nextError.message : t('auth.apiUnavailable'));
          return;
        }

        setTokenValidationError(getRecoveryErrorMessage(nextError, t));
      })
      .finally(() => {
        if (isActive) {
          setIsValidatingToken(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [t, token]);

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!token) {
    return (
      <AuthCard title={t('auth.resetPassword.title')} description={t('auth.resetPassword.incompleteDescription')}>
        <div className="space-y-4">
          <ErrorState message={t('auth.validation.tokenRequired')} />
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            to="/login"
          >
            {t('auth.resetPassword.backToLogin')}
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (isValidatingToken) {
    return (
      <AuthCard title={t('auth.resetPassword.title')} description={t('auth.resetPassword.checkingDescription')}>
        <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">{t('auth.resetPassword.validating')}</div>
      </AuthCard>
    );
  }

  if (!isTokenValid) {
    return (
      <AuthCard title={t('auth.resetPassword.title')} description={t('auth.resetPassword.invalidDescription')}>
        <div className="space-y-4">
          <ErrorState message={tokenValidationError ?? t('auth.resetPassword.tokenInvalid')} />
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            to="/forgot-password"
          >
            {t('auth.resetPassword.requestNewLink')}
          </Link>
          <div className="text-center text-sm text-muted-foreground">
            <Link className="transition-colors hover:text-foreground" to="/login">
              {t('auth.resetPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title={t('auth.resetPassword.title')} description={t('auth.resetPassword.description')}>
      {successMessage ? (
        <div className="space-y-4">
          <Alert>
            <AlertTitle>{t('auth.resetPassword.successTitle')}</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            to="/login"
          >
            {t('auth.resetPassword.continueToLogin')}
          </Link>
        </div>
      ) : (
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              setError(null);
              try {
                await sdk.auth.resetPassword({
                  token,
                  password: values.password,
                  passwordConfirmation: values.passwordConfirmation
                });
                setSuccessMessage(t('auth.resetPassword.success'));
              } catch (nextError) {
                setError(getRecoveryErrorMessage(nextError, t));
              }
            })}
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.resetPassword.passwordLabel')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="new-password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="passwordConfirmation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.resetPassword.confirmPasswordLabel')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="new-password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error ? <ErrorState message={error} /> : null}

            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? t('auth.resetPassword.submitting') : t('auth.resetPassword.submit')}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Link className="transition-colors hover:text-foreground" to="/login">
                {t('auth.resetPassword.backToLogin')}
              </Link>
            </div>
          </form>
        </Form>
      )}
    </AuthCard>
  );
}
