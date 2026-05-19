import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { UsersToolbarProps } from '@/features/users/users-page.types';

export function UsersToolbar({ search, onSearchChange, status, onStatusChange }: UsersToolbarProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="users-search">Search</Label>
        <Input
          id="users-search"
          placeholder="Search by name or email"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="users-status">Status</Label>
        <Select
          id="users-status"
          className="w-full md:max-w-36"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as typeof status)}
        >
          <option value="ALL">All</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="BLOCKED">Blocked</option>
        </Select>
      </div>
    </div>
  );
}
