export type AppModuleManifest = {
  name: string;
  title: string;
  version: string;
  description?: string;
  permissions?: string[];
  settingsSchema?: Record<string, unknown>;
  adminMenu?: Array<{
    label: string;
    path: string;
    permission?: string;
    icon?: string;
    order?: number;
  }>;
};
