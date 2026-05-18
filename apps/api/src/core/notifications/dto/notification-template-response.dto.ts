import { NotificationChannel } from '@prisma/client';

export type NotificationTemplateResponseDto = {
  id: string;
  event: string;
  title: string;
  message: string;
  emailSubject: string | null;
  emailBody: string | null;
  channels: NotificationChannel[];
  createdAt: Date;
  updatedAt: Date;
};
