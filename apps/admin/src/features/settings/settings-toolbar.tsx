import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { SettingsToolbarProps } from '@/features/settings/settings-page.types';

export function SettingsToolbar({
  search,
  onSearchChange,
  scope,
  onScopeChange,
  module,
  onModuleChange,
  modules,
  onCreate,
  onOpenSchema
}: SettingsToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-3">
      <div className="space-y-2">
        <Label htmlFor="settings-search">Search</Label>
        <Input
          id="settings-search"
          placeholder="Search by key or module"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-scope">Scope</Label>
        <Select id="settings-scope" value={scope} onChange={(event) => onScopeChange(event.target.value as 'ALL' | 'GLOBAL' | 'ORGANIZATION' | 'MODULE')}>
          <option value="ALL">All scopes</option>
          <option value="GLOBAL">GLOBAL</option>
          <option value="ORGANIZATION">ORGANIZATION</option>
          <option value="MODULE">MODULE</option>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="settings-module">Module</Label>
        <Select id="settings-module" value={module} onChange={(event) => onModuleChange(event.target.value)}>
          <option value="ALL">All modules</option>
          {modules.map((item) => (
            <option key={item.name} value={item.name}>
              {item.title}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-end gap-2 md:col-span-3">
        <Button type="button" onClick={onCreate}>
          New setting
        </Button>
        <Button type="button" variant="outline" onClick={onOpenSchema}>
          View module schema
        </Button>
      </div>
    </div>
  );
}
