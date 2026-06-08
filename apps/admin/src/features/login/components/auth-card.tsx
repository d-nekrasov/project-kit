import type { PropsWithChildren, ReactNode } from 'react';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

type AuthCardProps = PropsWithChildren<{
  title: string;
  description: string;
  footer?: ReactNode;
}>;

export function AuthCard({ title, description, footer, children }: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>{children}</CardContent>
        {footer ? <CardFooter className="flex justify-start border-t pt-6">{footer}</CardFooter> : null}
      </Card>
    </div>
  );
}
