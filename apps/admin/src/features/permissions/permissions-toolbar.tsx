import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { PermissionsToolbarProps } from '@/features/permissions/permissions-page.types';

export function PermissionsToolbar({
  search,
  onSearchChange,
  module,
  onModuleChange,
  modules,
  viewMode,
  onViewModeChange,
  isModulesLoading
}: PermissionsToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="permissions-search">Search</Label>
        <Input
          id="permissions-search"
          placeholder="Search by code, module, resource or action"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="permissions-module">Module</Label>
        <Select id="permissions-module" value={module} onChange={(event) => onModuleChange(event.target.value)} disabled={isModulesLoading}>
          <option value="ALL">All modules</option>
          {modules.map((item) => (
            <option key={item.module} value={item.module}>
              {item.module} ({item.permissionsCount})
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label>View</Label>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('table')}
          >
            Table
          </Button>
          <Button
            type="button"
            variant={viewMode === 'grouped' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('grouped')}
          >
            Grouped
          </Button>
        </div>
      </div>
    </div>
  );
}
