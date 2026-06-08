export type AppModuleManifest = {
  name: string;
  title: string;
  titleKey?: string;
  version: string;
  description?: string;
  descriptionKey?: string;
  permissions?: string[];
  settingsSchema?: Record<string, unknown>;
  adminMenu?: Array<{
    label: string;
    labelKey?: string;
    path: string;
    permission?: string;
    icon?: string;
    order?: number;
  }>;
};
