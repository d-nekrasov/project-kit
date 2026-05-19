import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { AUDIT_ACTION_OPTIONS, AUDIT_ENTITY_TYPE_OPTIONS, type AuditLogsToolbarProps } from '@/features/audit-logs/audit-logs-page.types';

export function AuditLogsToolbar({
  search,
  action,
  entityType,
  entityId,
  userId,
  organizationId,
  dateFrom,
  dateTo,
  onSearchChange,
  onActionChange,
  onEntityTypeChange,
  onEntityIdChange,
  onUserIdChange,
  onOrganizationIdChange,
  onDateFromChange,
  onDateToChange,
  onReset
}: AuditLogsToolbarProps) {
  return (
    <div className="grid gap-3 rounded-lg border bg-white p-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="space-y-1 md:col-span-2 xl:col-span-4">
        <Label htmlFor="audit-logs-search">Search</Label>
        <Input
          id="audit-logs-search"
          placeholder="Search action, entity, user, organization, metadata"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-logs-action">Action</Label>
        <Select id="audit-logs-action" value={action} onChange={(event) => onActionChange(event.target.value)}>
          <option value="">All</option>
          {AUDIT_ACTION_OPTIONS.filter((item) => item).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-logs-entity-type">Entity type</Label>
        <Select id="audit-logs-entity-type" value={entityType} onChange={(event) => onEntityTypeChange(event.target.value)}>
          <option value="">All</option>
          {AUDIT_ENTITY_TYPE_OPTIONS.filter((item) => item).map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-logs-entity-id">Entity ID</Label>
        <Input id="audit-logs-entity-id" value={entityId} onChange={(event) => onEntityIdChange(event.target.value)} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-logs-user-id">User ID</Label>
        <Input id="audit-logs-user-id" value={userId} onChange={(event) => onUserIdChange(event.target.value)} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-logs-organization-id">Organization ID</Label>
        <Input
          id="audit-logs-organization-id"
          value={organizationId}
          onChange={(event) => onOrganizationIdChange(event.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-logs-date-from">Date from</Label>
        <Calendar id="audit-logs-date-from" value={dateFrom} onChange={(event) => onDateFromChange(event.target.value)} />
      </div>

      <div className="space-y-1">
        <Label htmlFor="audit-logs-date-to">Date to</Label>
        <Calendar id="audit-logs-date-to" value={dateTo} onChange={(event) => onDateToChange(event.target.value)} />
      </div>

      <div className="space-y-1 xl:col-span-2">
        <Label className="opacity-0" aria-hidden="true">
          Actions
        </Label>
        <div className="flex justify-end">
          <Button type="button" variant="outline" size="sm" className="w-full md:w-auto" onClick={onReset}>
            Reset filters
          </Button>
        </div>
      </div>
    </div>
  );
}
