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
    <div className="grid gap-4 rounded-lg border bg-white p-4 lg:grid-cols-3">
      <div className="grid gap-2">
        <Label htmlFor="permissions-search" className="h-5">
          Search
        </Label>
        <div className="min-h-10">
          <Input
            id="permissions-search"
            placeholder="Search by code, module, resource or action"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="permissions-module" className="h-5">
          Module
        </Label>
        <div className="min-h-10">
          <Select
            id="permissions-module"
            value={module}
            onChange={(event) => onModuleChange(event.target.value)}
            disabled={isModulesLoading}
          >
            <option value="ALL">All modules</option>
            {modules.map((item) => (
              <option key={item.module} value={item.module}>
                {item.module} ({item.permissionsCount})
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid gap-2">
        <Label className="h-5">View</Label>
        <div className="flex min-h-10 items-center gap-2">
          <Button
            type="button"
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            className="h-10"
            onClick={() => onViewModeChange('table')}
          >
            Table
          </Button>
          <Button
            type="button"
            variant={viewMode === 'grouped' ? 'default' : 'outline'}
            size="sm"
            className="h-10"
            onClick={() => onViewModeChange('grouped')}
          >
            Grouped
          </Button>
        </div>
      </div>
    </div>
  );
}
