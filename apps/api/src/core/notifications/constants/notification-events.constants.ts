import { NotificationChannel, NotificationConnectorStatus } from '@prisma/client';

export const DEFAULT_NOTIFICATION_CONNECTORS = [
  {
    code: 'in_app',
    channel: NotificationChannel.IN_APP,
    status: NotificationConnectorStatus.ENABLED,
    config: {}
  },
  {
    code: 'smtp_email',
    channel: NotificationChannel.EMAIL,
    status: NotificationConnectorStatus.DISABLED,
    config: {
      host: '',
      port: 587,
      secure: false,
      username: '',
      password: '',
      from: ''
    }
  }
] as const;

export const DEFAULT_NOTIFICATION_TEMPLATES = [
  {
    event: 'document.created',
    title: 'New document: {{title}}',
    message: 'Document "{{title}}" was created.',
    emailSubject: 'New document: {{title}}',
    emailBody: 'Document "{{title}}" was created.',
    channels: [NotificationChannel.IN_APP]
  },
  {
    event: 'document.status_changed',
    title: 'Document status changed: {{title}}',
    message: 'Document "{{title}}" status changed to {{status}}.',
    emailSubject: 'Document status changed: {{title}}',
    emailBody: 'Document "{{title}}" status changed to {{status}}.',
    channels: [NotificationChannel.IN_APP]
  }
] as const;

export const NOTIFICATION_CONNECTOR_CODES = {
  IN_APP: 'in_app',
  SMTP_EMAIL: 'smtp_email'
} as const;
