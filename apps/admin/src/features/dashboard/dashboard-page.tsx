import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/features/auth/use-auth';

const cards = ['Users', 'Roles', 'Modules', 'Documents'];

export function DashboardPage() {
  const auth = useAuth();
  const activeOrg = auth.user?.organizations.find((item) => item.id === auth.activeOrganizationId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{import.meta.env.VITE_APP_NAME || 'Project Kit'}</CardTitle>
          <CardDescription>Admin dashboard shell</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 text-sm text-slate-600">
          <div>User: {auth.user?.name ?? auth.user?.email}</div>
          <div>Active organization: {activeOrg?.name ?? 'None'}</div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <Card key={item}>
            <CardHeader>
              <CardTitle className="text-base">{item}</CardTitle>
              <CardDescription>Module placeholder</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
