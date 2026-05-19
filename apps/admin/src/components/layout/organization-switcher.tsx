import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';

export function OrganizationSwitcher() {
  const auth = useAuth();

  const organizations = auth.user?.organizations ?? [];

  if (organizations.length <= 1) {
    return <div className="text-sm text-slate-600">{organizations[0]?.name ?? 'No organization'}</div>;
  }

  return (
    <Select
      value={auth.activeOrganizationId ?? ''}
      onChange={(event) => {
        void auth.setActiveOrganization(event.target.value);
      }}
    >
      {organizations.map((org) => (
        <option key={org.id} value={org.id}>
          {org.name}
        </option>
      ))}
    </Select>
  );
}
