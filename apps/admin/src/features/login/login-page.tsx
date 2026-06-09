import { ApiError } from '@project-kit/sdk';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useNavigate } from 'react-router-dom';

import { ErrorState } from '@/components/common/error-state';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/features/auth/use-auth';
import { AuthCard } from '@/features/login/components/auth-card';
import { createLoginSchema, type LoginForm } from '@/features/login/schemas/login.schema';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { useI18n } from '@/lib/i18n/use-i18n';

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const { t } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => createLoginSchema(t), [t]);

  const form = useForm<LoginForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  if (auth.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <AuthCard title={t('auth.loginTitle')} description={t('auth.loginDescription')}>
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
                setError(t('auth.invalidCredentials'));
                return;
              }

              if (nextError instanceof ApiError && nextError.status === 0) {
                setError(import.meta.env.DEV ? nextError.message : t('auth.apiUnavailable'));
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
                <FormLabel>{t('auth.email')}</FormLabel>
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
                  <FormLabel>{t('auth.password')}</FormLabel>
                  <Link className="text-sm text-muted-foreground transition-colors hover:text-foreground" to="/forgot-password">
                    {t('auth.forgotPassword.link')}
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
            {form.formState.isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
          </Button>
        </form>
      </Form>
    </AuthCard>
  );
}
