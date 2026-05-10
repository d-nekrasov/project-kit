import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RolesToolbarProps } from '@/features/roles/roles-page.types';

export function RolesToolbar({ search, onSearchChange, includeSystem, onIncludeSystemChange }: RolesToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2">
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
