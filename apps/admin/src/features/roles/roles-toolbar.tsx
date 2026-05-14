import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { RolesToolbarProps } from '@/features/roles/roles-page.types';

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
  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3">
      {isSuperAdmin ? (
        <div className="space-y-2">
          <Label htmlFor="roles-organization">Organization</Label>
          <Select
            id="roles-organization"
            value={selectedOrganizationId ?? ''}
            onChange={(event) => onSelectedOrganizationIdChange(event.target.value)}
            disabled={isOrganizationsLoading}
          >
            <option value="">Select organization</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name} ({organization.slug})
              </option>
            ))}
          </Select>
          <p className="text-xs text-slate-500">Roles are scoped to the selected organization.</p>
          {organizationsErrorMessage ? <p className="text-xs text-red-600">{organizationsErrorMessage}</p> : null}
        </div>
      ) : (
        <div className="space-y-2">
          <Label>Organization</Label>
          <div className="rounded-md border bg-slate-50 px-3 py-2 text-sm text-slate-700">
            Current organization: {currentOrganizationName ?? 'Active organization'}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="roles-search">Search</Label>
        <Input
          id="roles-search"
          placeholder="Search by role name or code"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="flex items-end">
        <label htmlFor="roles-include-system" className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            id="roles-include-system"
            type="checkbox"
            className="h-4 w-4"
            checked={includeSystem}
            onChange={(event) => onIncludeSystemChange(event.target.checked)}
          />
          Include system roles
        </label>
      </div>
    </div>
  );
}
