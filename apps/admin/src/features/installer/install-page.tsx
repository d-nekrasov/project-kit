import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { LoadingScreen } from '@/components/common/loading-screen';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { sdk } from '@/lib/sdk';

type ProjectLocale = 'ru' | 'en';

const localeOptions = [
  { value: 'ru', label: 'Русский' },
  { value: 'en', label: 'English' }
] as const satisfies ReadonlyArray<{ value: ProjectLocale; label: string }>;

const installSchema = z.object({
  appName: z.string().min(2),
  organizationName: z.string().min(2),
  organizationSlug: z.string().regex(/^[a-z0-9-]+$/),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminName: z.string().min(2),
  locale: z.enum(['ru', 'en'])
});

type InstallForm = z.infer<typeof installSchema>;
type I18nCatalogResponse = {
  locale: ProjectLocale;
  fallbackLocale: string;
  messages: Record<string, string>;
};

export function InstallPage() {
  const navigate = useNavigate();

  const statusQuery = useQuery({
    queryKey: ['installer-status'],
    queryFn: () => sdk.installer.status()
  });

  const form = useForm<InstallForm>({
    resolver: zodResolver(installSchema),
    defaultValues: {
      appName: import.meta.env.VITE_APP_NAME || 'Project Kit',
      organizationName: 'Default Organization',
      organizationSlug: 'default',
      adminEmail: 'admin@example.com',
      adminPassword: 'password123',
      adminName: 'Admin',
      locale: 'ru'
    }
  });

  if (statusQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (statusQuery.data?.installed) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <CardTitle>Project setup</CardTitle>
          <CardDescription>Create first organization and admin user.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit(async (values) => {
                await sdk.installer.setup(values);
                await sdk.client.get<I18nCatalogResponse>('/i18n/catalog', {
                  skipAuth: true,
                  skipOrganization: true
                });
                navigate('/login');
              })}
            >
              <FormField
                control={form.control}
                name="appName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>App Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="organizationName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="organizationSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization Slug</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="locale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Language</FormLabel>
                      <FormControl>
                        <Select {...field}>
                          {localeOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adminName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="adminEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="adminPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admin Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {form.formState.isSubmitSuccessful ? (
                <Alert>
                  <AlertTitle>Setup complete</AlertTitle>
                  <AlertDescription>Redirecting to login...</AlertDescription>
                </Alert>
              ) : null}

              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Installing...' : 'Run setup'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
