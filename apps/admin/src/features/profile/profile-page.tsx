import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { ErrorState } from '@/components/common/error-state';
import { LoadingScreen } from '@/components/common/loading-screen';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserDetailCard } from '@/features/users/user-detail-card';
import { UserOrganizationsCard } from '@/features/users/user-organizations-card';
import { usersQueryKeys } from '@/features/users/users-query-keys';
import { useAuth } from '@/features/auth/use-auth';
import { getApiErrorMessage } from '@/lib/api-error-message';
import { sdk } from '@/lib/sdk';

export function ProfilePage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');

  const profileQuery = useQuery({
    queryKey: usersQueryKeys.me(),
    queryFn: () => sdk.users.me()
  });

  useEffect(() => {
    if (profileQuery.data) {
      setName(profileQuery.data.name ?? '');
    }
  }, [profileQuery.data]);

  const updateProfileMutation = useMutation({
    mutationFn: () => sdk.users.updateMe({ name }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: usersQueryKeys.me() }),
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] }),
        auth.refreshMe()
      ]);
    }
  });

  if (profileQuery.isLoading) {
    return <LoadingScreen />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return <ErrorState message={profileQuery.isError ? getApiErrorMessage(profileQuery.error) : 'Profile not found'} />;
  }

  const user = profileQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Profile</h2>
        <p className="text-sm text-slate-600">View your account details and update your display name.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-[1fr_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              updateProfileMutation.mutate();
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input id="profile-email" value={user.email} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name">Name</Label>
              <Input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="md:col-span-2">
              {updateProfileMutation.isError ? (
                <Alert className="mb-4 border-red-200 bg-red-50 text-red-700">
                  <AlertTitle>Request failed</AlertTitle>
                  <AlertDescription>{getApiErrorMessage(updateProfileMutation.error)}</AlertDescription>
                </Alert>
              ) : null}
              <Button type="submit" disabled={updateProfileMutation.isPending || name.trim().length < 2}>
                {updateProfileMutation.isPending ? 'Saving...' : 'Save profile'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <UserDetailCard user={user} />
      <UserOrganizationsCard user={user} />
    </div>
  );
}
