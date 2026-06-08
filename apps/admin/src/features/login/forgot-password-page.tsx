import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
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
import { type ForgotPasswordForm, forgotPasswordSchema } from '@/features/login/schemas/forgot-password.schema';
import { sdk } from '@/lib/sdk';

const SUCCESS_MESSAGE =
  'If an account exists for that email, password reset instructions will be sent.';

export function ForgotPasswordPage() {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ''
    }
  });

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthCard title="Reset password" description="Enter your email to receive password reset instructions.">
      {isSubmitted ? (
        <div className="space-y-4">
          <Alert>
            <AlertTitle>Check your email</AlertTitle>
            <AlertDescription>{SUCCESS_MESSAGE}</AlertDescription>
          </Alert>
          <Link
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            to="/login"
          >
            Back to login
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
                setError(getRecoveryErrorMessage(nextError));
              }
            })}
          >
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input autoComplete="email" type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {error ? <ErrorState message={error} /> : null}

            <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Sending...' : 'Send reset link'}
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
