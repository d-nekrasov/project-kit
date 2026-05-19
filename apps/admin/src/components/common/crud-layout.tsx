import type { PropsWithChildren, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

type CrudPageHeaderProps = {
  title: string;
  description: string;
  action?: ReactNode;
};

export function CrudPageHeader({ title, description, action }: CrudPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function CrudToolbarCard({ children }: PropsWithChildren) {
  return (
    <Card>
      <CardContent className="p-4">{children}</CardContent>
    </Card>
  );
}

export function CrudTableCard({ children, className }: PropsWithChildren<{ className?: string }>) {
  return <Card className={cn('overflow-visible', className)}>{children}</Card>;
}

type CrudPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export function CrudPagination({ page, totalPages, total, limit, onPageChange, onLimitChange }: CrudPaginationProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 p-4 text-sm md:flex-row md:items-center md:justify-between">
        <div className="text-muted-foreground">
          Page {page} of {totalPages} • Total: {total}
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
            Previous
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= totalPages}>
            Next
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">Rows per page</span>
          <Select
            value={String(limit)}
            onChange={(event) => {
              onLimitChange(Number(event.target.value));
            }}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </Select>
        </div>
      </CardHeader>
    </Card>
  );
}
