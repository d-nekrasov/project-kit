import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

type PlaceholderPageProps = {
  title: string;
};

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{title} page will be implemented next.</CardDescription>
      </CardHeader>
      <CardContent className="text-sm text-slate-600">Coming soon.</CardContent>
    </Card>
  );
}
