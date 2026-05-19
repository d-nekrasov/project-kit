import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { JsonValueEditorProps } from '@/features/settings/settings-page.types';

export function JsonValueEditor({ value, onChange, error }: JsonValueEditorProps) {
  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      onChange(JSON.stringify(parsed, null, 2));
    } catch {
      // keep current value unchanged when JSON is invalid
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="setting-value">Value (JSON)</Label>
        <Button type="button" variant="outline" size="sm" onClick={handleFormat}>
          Format JSON
        </Button>
      </div>
      <Textarea
        id="setting-value"
        className="min-h-44 font-mono"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
      <p className="text-xs text-slate-500">Value must be valid JSON. Strings must be wrapped in quotes.</p>
      <p className="text-xs text-slate-500">Examples: "Project Kit", true, 10485760, ["pdf", "docx"], {'{"enabled": true}'}</p>
    </div>
  );
}
