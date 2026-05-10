import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
      <textarea
        id="setting-value"
        className="min-h-44 w-full rounded-md border border-slate-300 bg-white p-3 font-mono text-sm outline-none"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <p className="text-xs text-slate-500">Value must be valid JSON. Strings must be wrapped in quotes.</p>
      <p className="text-xs text-slate-500">Examples: "Project Kit", true, 10485760, ["pdf", "docx"], {'{"enabled": true}'}</p>
    </div>
  );
}
