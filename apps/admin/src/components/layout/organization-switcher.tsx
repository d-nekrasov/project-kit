import { Select } from '@/components/ui/select';
import { useAuth } from '@/features/auth/use-auth';
import { useI18n } from '@/lib/i18n/use-i18n';

export function OrganizationSwitcher() {
  const auth = useAuth();
  const { t } = useI18n();

  const organizations = auth.user?.organizations ?? [];

  if (organizations.length <= 1) {
    return <div className="text-sm text-muted-foreground">{organizations[0]?.name ?? t('users.table.noOrganizations')}</div>;
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
