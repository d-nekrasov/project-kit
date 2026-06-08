import { ApiError } from '@project-kit/sdk';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/use-auth';
import { AuthCard } from '@/features/login/components/auth-card';
import { type LoginForm, loginSchema } from '@/features/login/schemas/login.schema';
import { getApiErrorMessage } from '@/lib/api-error-message';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthCard title="Login" description="Sign in to access admin dashboard.">
      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            setError(null);
            try {
              await auth.login(values.email, values.password);
              navigate('/');
            } catch (nextError) {
              if (nextError instanceof ApiError && nextError.status === 401) {
                setError('Invalid email or password.');
                return;
              }

              if (nextError instanceof ApiError && nextError.status === 0) {
                setError(import.meta.env.DEV ? nextError.message : 'Unable to connect to API. Check that backend is running.');
                return;
              }

              setError(getApiErrorMessage(nextError));
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
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between gap-3">
                  <FormLabel>Password</FormLabel>
                  <Link className="text-sm text-muted-foreground transition-colors hover:text-foreground" to="/forgot-password">
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {error ? <ErrorState message={error} /> : null}

          <Button className="w-full" type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
