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
import { type ResetPasswordForm, resetPasswordSchema } from '@/features/login/schemas/reset-password.schema';
import { sdk } from '@/lib/sdk';

function getResetPasswordTokenErrorMessage(reason: 'invalid' | 'expired' | 'used' | 'user_inactive'): string {
  if (reason === 'expired') {
    return 'This password reset link has expired. Request a new reset link and try again.';
  }

  if (reason === 'used') {
    return 'This password reset link has already been used. Request a new reset link and try again.';
  }

  if (reason === 'user_inactive') {
    return 'This password reset link is no longer active. Contact an administrator or request a new reset link.';
  }

  return 'This password reset link is invalid. Request a new reset link and try again.';
}

export function ResetPasswordPage() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isValidatingToken, setIsValidatingToken] = useState(true);
  const [tokenValidationError, setTokenValidationError] = useState<string | null>(null);
  const [isTokenValid, setIsTokenValid] = useState(false);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
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
          setTokenValidationError(getResetPasswordTokenErrorMessage(response.reason ?? 'invalid'));
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
          setTokenValidationError(
            import.meta.env.DEV ? nextError.message : 'Unable to connect to API. Check that backend is running.'
          );
          return;
        }

        setTokenValidationError(getRecoveryErrorMessage(nextError));
      })
      .finally(() => {
        if (isActive) {
          setIsValidatingToken(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, [token]);

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (!token) {
    return (
      <AuthCard title="Reset password" description="This password reset link is incomplete.">
        <div className="space-y-4">
          <ErrorState message="Password reset token is missing. Request a new reset link and try again." />
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            to="/login"
          >
            Go to login
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (isValidatingToken) {
    return (
      <AuthCard title="Reset password" description="Checking your password reset link.">
        <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">Validating reset link...</div>
      </AuthCard>
    );
  }

  if (!isTokenValid) {
    return (
      <AuthCard title="Reset password" description="This password reset link cannot be used.">
        <div className="space-y-4">
          <ErrorState
            message={tokenValidationError ?? 'This password reset link is invalid. Request a new reset link and try again.'}
          />
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            to="/forgot-password"
          >
            Request a new reset link
          </Link>
          <div className="text-center text-sm text-muted-foreground">
            <Link className="transition-colors hover:text-foreground" to="/login">
              Back to login
            </Link>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password" description="Choose a new password for your admin account.">
      {successMessage ? (
        <div className="space-y-4">
          <Alert>
            <AlertTitle>Password updated</AlertTitle>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            to="/login"
          >
            Continue to login
          </Link>
        </div>
      ) : (
        <Form {...form}>
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              setError(null);
              try {
                const response = await sdk.auth.resetPassword({
                  token,
                  password: values.password,
                  passwordConfirmation: values.passwordConfirmation
                });
                setSuccessMessage(response.message);
              } catch (nextError) {
                setError(getRecoveryErrorMessage(nextError));
              }
            })}
          >
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
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
                  <FormLabel>Confirm new password</FormLabel>
                  <FormControl>
                    <Input autoComplete="new-password" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error ? <ErrorState message={error} /> : null}

            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Resetting...' : 'Reset password'}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              <Link className="transition-colors hover:text-foreground" to="/login">
                Back to login
              </Link>
            </div>
          </form>
        </Form>
      )}
    </AuthCard>
  );
}
