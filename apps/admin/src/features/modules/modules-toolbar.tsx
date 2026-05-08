import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { ModulesToolbarProps } from '@/features/modules/modules-page.types';

export function ModulesToolbar({ search, onSearchChange, status, onStatusChange }: ModulesToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="modules-search">Search</Label>
        <Input
          id="modules-search"
          placeholder="Search by module name or title"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="modules-status">Status</Label>
        <Select id="modules-status" value={status} onChange={(event) => onStatusChange(event.target.value as typeof status)}>
          <option value="ALL">All</option>
          <option value="ENABLED">Enabled</option>
          <option value="DISABLED">Disabled</option>
        </Select>
      </div>
    </div>
  );
}
