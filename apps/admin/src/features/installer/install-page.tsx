import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Navigate, useNavigate } from 'react-router-dom';
import { z } from 'zod';

import { LoadingScreen } from '@/components/common/loading-screen';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sdk } from '@/lib/sdk';

const installSchema = z.object({
  appName: z.string().min(2),
  organizationName: z.string().min(2),
  organizationSlug: z.string().regex(/^[a-z0-9-]+$/),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
  adminName: z.string().min(2)
});

type InstallForm = z.infer<typeof installSchema>;

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
      adminName: 'Admin'
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
          <form
            className="grid gap-4"
            onSubmit={form.handleSubmit(async (values) => {
              await sdk.installer.setup(values);
              navigate('/login');
            })}
          >
            <div className="space-y-2">
              <Label htmlFor="appName">App Name</Label>
              <Input id="appName" {...form.register('appName')} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input id="organizationName" {...form.register('organizationName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organizationSlug">Organization Slug</Label>
                <Input id="organizationSlug" {...form.register('organizationSlug')} />
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="adminName">Admin Name</Label>
                <Input id="adminName" {...form.register('adminName')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input id="adminEmail" type="email" {...form.register('adminEmail')} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adminPassword">Admin Password</Label>
              <Input id="adminPassword" type="password" {...form.register('adminPassword')} />
            </div>

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
        </CardContent>
      </Card>
    </div>
  );
}
