import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  SYSTEM_LOG_LEVEL_OPTIONS,
  SYSTEM_LOG_SOURCES,
  type SystemLogLevelFilter,
  type SystemLogsToolbarProps
} from '@/features/system-logs/system-logs-page.types';

export function SystemLogsToolbar({
  search,
  level,
  source,
  userId,
  organizationId,
  dateFrom,
  dateTo,
  onSearchChange,
  onLevelChange,
  onSourceChange,
  onUserIdChange,
  onOrganizationIdChange,
  onDateFromChange,
  onDateToChange,
  onReset
}: SystemLogsToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-2 lg:col-span-4">
        <Label htmlFor="system-logs-search">Search</Label>
        <Input
          id="system-logs-search"
          placeholder="Search message, source, user, organization, context"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="system-logs-level">Level</Label>
        <Select
          id="system-logs-level"
          value={level}
          onChange={(event) => onLevelChange(event.target.value as SystemLogLevelFilter)}
        >
          {SYSTEM_LOG_LEVEL_OPTIONS.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="system-logs-source">Source</Label>
        <Select id="system-logs-source" value={source} onChange={(event) => onSourceChange(event.target.value)}>
          <option value="">All</option>
          {SYSTEM_LOG_SOURCES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="system-logs-user-id">User ID</Label>
        <Input id="system-logs-user-id" value={userId} onChange={(event) => onUserIdChange(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="system-logs-organization-id">Organization ID</Label>
        <Input id="system-logs-organization-id" value={organizationId} onChange={(event) => onOrganizationIdChange(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="system-logs-date-from">Date from</Label>
        <Input id="system-logs-date-from" type="date" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="system-logs-date-to">Date to</Label>
        <Input id="system-logs-date-to" type="date" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
      </div>

      <div className="flex items-end">
        <Button type="button" variant="outline" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      </div>
    </div>
  );
}
