import { AppModuleManifest } from '../../core/module-registry/types/module-manifest.type';

export const DOCUMENTS_MODULE_MANIFEST: AppModuleManifest = {
  name: 'documents',
  title: 'Documents',
  titleKey: 'documents.title',
  version: '0.1.0',
  description: 'Manage organization documents',
  descriptionKey: 'documents.description',
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
      labelKey: 'documents.menu',
      path: '/documents',
      permission: 'documents.read',
      icon: 'file-text',
      order: 100
    }
  ]
};
