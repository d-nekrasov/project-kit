import type { SettingResponse } from '@project-kit/sdk';
import { MoreHorizontal, Pencil } from 'lucide-react';

import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SettingScopeBadge } from '@/features/settings/setting-scope-badge';
import type { SettingsTableProps } from '@/features/settings/settings-page.types';

function formatDate(value: string | null) {
  if (!value) {
    return '—';
  }

  return new Date(value).toLocaleString();
}

function toShortValue(value: SettingResponse['value']) {
  if (typeof value === 'string') {
    return value.length > 120 ? `${value.slice(0, 120)}...` : value;
  }

  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return String(value);
  }

  const text = JSON.stringify(value);
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function SettingsTableSkeleton() {
  return (
    <div className="rounded-lg border bg-white p-2">
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function SettingsTable({ settings, isLoading, onEdit }: SettingsTableProps) {
  if (isLoading) {
    return <SettingsTableSkeleton />;
  }

  if (!settings.length) {
    return <EmptyState title="No settings found" description="Try changing search or filters." />;
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Key</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Updated at</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settings.map((setting) => (
              <TableRow key={setting.id}>
                <TableCell className="font-mono text-xs">{setting.key}</TableCell>
                <TableCell className="max-w-[420px]">
                  <span className="line-clamp-2 break-all font-mono text-xs text-slate-700">{toShortValue(setting.value)}</span>
                </TableCell>
                <TableCell>
                  <SettingScopeBadge scope={setting.scope} />
                </TableCell>
                <TableCell className="font-mono text-xs">{setting.module ?? '—'}</TableCell>
                <TableCell className="font-mono text-xs">{setting.organizationId ?? '—'}</TableCell>
                <TableCell>{formatDate(setting.updatedAt)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button type="button" variant="ghost" size="sm" aria-label={`Open actions for ${setting.key}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => onEdit(setting)}>
                        <Pencil className="mr-2 inline h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
