import { Injectable } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { SmtpConnectorConfig } from '../types/notification.types';
import { NotificationConnector, NotificationConnectorSendInput, NotificationConnectorSendResult } from './notification-connector.interface';

@Injectable()
export class EmailSmtpNotificationConnector implements NotificationConnector {
  async send(input: NotificationConnectorSendInput): Promise<NotificationConnectorSendResult> {
    const config = (input.config ?? {}) as SmtpConnectorConfig;
    if (!input.to) {
      return { ok: false, error: 'Recipient email is missing' };
    }
    if (!input.subject || !input.body) {
      return { ok: false, error: 'Email subject or body is missing' };
    }
    if (!config.host || !config.port || !config.from) {
      return { ok: false, error: 'SMTP connector config is incomplete' };
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure ?? false,
      auth: config.username
        ? {
            user: config.username,
            pass: config.password ?? ''
          }
        : undefined
    });

    await transporter.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      text: input.body
    });

    return { ok: true };
  }
}
