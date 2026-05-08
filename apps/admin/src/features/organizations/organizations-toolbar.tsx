import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { OrganizationsToolbarProps } from '@/features/organizations/organizations-page.types';

export function OrganizationsToolbar({ search, onSearchChange, status, onStatusChange }: OrganizationsToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="organizations-search">Search</Label>
        <Input
          id="organizations-search"
          placeholder="Search by organization name or slug"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="organizations-status">Status</Label>
        <Select
          id="organizations-status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as typeof status)}
        >
          <option value="ALL">All</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </Select>
      </div>
    </div>
  );
}
