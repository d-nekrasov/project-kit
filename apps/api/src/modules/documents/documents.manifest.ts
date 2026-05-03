import { AppModuleManifest } from '../../core/module-registry/types/module-manifest.type';

export const DOCUMENTS_MODULE_MANIFEST: AppModuleManifest = {
  name: 'documents',
  title: 'Documents',
  version: '0.1.0',
  description: 'Documents management module',
  permissions: ['documents.read', 'documents.create', 'documents.update', 'documents.delete'],
  settingsSchema: {
    maxTitleLength: {
      type: 'number',
      default: 255
    },
    allowPublishedEdit: {
      type: 'boolean',
      default: true
    }
  },
  adminMenu: [
    {
      label: 'Documents',
      path: '/documents',
      permission: 'documents.read',
      icon: 'file-text',
      order: 100
    }
  ]
};
