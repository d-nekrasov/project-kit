import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { RolesToolbarProps } from '@/features/roles/roles-page.types';
import { useI18n } from '@/lib/i18n/use-i18n';

export function RolesToolbar({
  search,
  onSearchChange,
  includeSystem,
  onIncludeSystemChange,
  isSuperAdmin,
  organizations,
  selectedOrganizationId,
  currentOrganizationName,
  onSelectedOrganizationIdChange,
  isOrganizationsLoading,
  organizationsErrorMessage
}: RolesToolbarProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-4 rounded-lg border bg-card p-4 lg:grid-cols-3">
      {isSuperAdmin ? (
        <div className="grid gap-2">
          <Label htmlFor="roles-organization" className="h-5">
            {t('roles.toolbar.organization')}
          </Label>
          <div className="min-h-10">
            <Select
              id="roles-organization"
              value={selectedOrganizationId ?? ''}
              onChange={(event) => onSelectedOrganizationIdChange(event.target.value)}
              disabled={isOrganizationsLoading}
            >
              <option value="">{t('roles.toolbar.selectOrganization')}</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name} ({organization.slug})
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{t('roles.toolbar.organizationScoped')}</p>
          {organizationsErrorMessage ? <p className="text-xs text-red-600">{organizationsErrorMessage}</p> : null}
        </div>
      ) : (
        <div className="grid gap-2">
          <Label className="h-5">{t('roles.toolbar.organization')}</Label>
          <div className="min-h-10 rounded-md border bg-muted/40 px-3 py-2 text-sm text-foreground/80">
            <span>{t('roles.toolbar.currentOrganization', { organization: currentOrganizationName ?? t('roles.toolbar.currentOrganizationFallback') })}</span>
          </div>
          <div className="h-4" />
        </div>
      )}

      <div className="grid gap-2">
        <Label htmlFor="roles-search" className="h-5">
          {t('common.search')}
        </Label>
        <div className="min-h-10">
          <Input
            id="roles-search"
            placeholder={t('roles.searchPlaceholder')}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="h-4" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="roles-include-system" className="h-5">
          {t('roles.toolbar.filters')}
        </Label>
        <div className="flex min-h-10 items-center">
          <label htmlFor="roles-include-system" className="flex cursor-pointer items-center gap-2 text-sm text-foreground/80">
            <Checkbox
              id="roles-include-system"
              checked={includeSystem}
              onChange={(event) => onIncludeSystemChange(event.target.checked)}
            />
            {t('roles.toolbar.includeSystem')}
          </label>
        </div>
        <div className="h-4" />
      </div>
    </div>
  );
}
