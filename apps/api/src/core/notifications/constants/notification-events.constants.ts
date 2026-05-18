import {
  NotificationChannel,
  NotificationConnectorStatus
} from '@prisma/client';

export const NOTIFICATION_EVENTS = {
  DOCUMENT_CREATED: 'document.created',
  DOCUMENT_STATUS_CHANGED: 'document.status_changed',
  USER_CREATED: 'user.created',
  USER_STATUS_CHANGED: 'user.status_changed',
  USER_ORGANIZATIONS_CHANGED: 'user.organizations_changed',
  USER_PROFILE_UPDATED: 'user.profile_updated'
} as const;

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
    event: NOTIFICATION_EVENTS.DOCUMENT_CREATED,
    title: 'New document: {{title}}',
    message: 'Document "{{title}}" was created.',
    emailSubject: 'New document: {{title}}',
    emailBody: 'Document "{{title}}" was created.',
    channels: [NotificationChannel.IN_APP]
  },
  {
    event: NOTIFICATION_EVENTS.DOCUMENT_STATUS_CHANGED,
    title: 'Document status changed: {{title}}',
    message: 'Document "{{title}}" status changed to {{status}}.',
    emailSubject: 'Document status changed: {{title}}',
    emailBody: 'Document "{{title}}" status changed to {{status}}.',
    channels: [NotificationChannel.IN_APP]
  },
  {
    event: NOTIFICATION_EVENTS.USER_CREATED,
    title: 'Welcome, {{name}}',
    message: 'Your account {{email}} was created in {{organizationName}}.',
    emailSubject: 'Welcome to Project Kit',
    emailBody: 'Your account {{email}} was created in {{organizationName}}.',
    channels: [NotificationChannel.IN_APP]
  },
  {
    event: NOTIFICATION_EVENTS.USER_STATUS_CHANGED,
    title: 'Account status changed',
    message: 'Your account status changed to {{status}}.',
    emailSubject: 'Account status changed',
    emailBody: 'Your account status changed to {{status}}.',
    channels: [NotificationChannel.IN_APP]
  },
  {
    event: NOTIFICATION_EVENTS.USER_ORGANIZATIONS_CHANGED,
    title: 'Organization access changed',
    message: 'Your access to {{organizationName}} was changed.',
    emailSubject: 'Organization access changed',
    emailBody:
      'Your access to {{organizationName}} was changed. Role: {{roleName}}. Status: {{membershipStatus}}.',
    channels: [NotificationChannel.IN_APP]
  },
  {
    event: NOTIFICATION_EVENTS.USER_PROFILE_UPDATED,
    title: 'Profile updated',
    message: 'Your profile was updated.',
    emailSubject: 'Profile updated',
    emailBody: 'Your profile was updated. Changed fields: {{changedFields}}.',
    channels: [NotificationChannel.IN_APP]
  }
] as const;

export const NOTIFICATION_CONNECTOR_CODES = {
  IN_APP: 'in_app',
  SMTP_EMAIL: 'smtp_email'
} as const;
