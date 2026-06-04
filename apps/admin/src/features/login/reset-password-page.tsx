import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
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

export function ResetPasswordPage() {
  const auth = useAuth();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      passwordConfirmation: ''
    }
  });

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
