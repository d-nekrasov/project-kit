import { Injectable } from "@nestjs/common";
import nodemailer from "nodemailer";
import { ConfigEncryptionService } from "../../../common/security/config-encryption.service";
import { SmtpConnectorConfig } from "../types/notification.types";
import {
  NotificationConnector,
  NotificationConnectorSendInput,
  NotificationConnectorSendResult,
} from "./notification-connector.interface";

@Injectable()
export class EmailSmtpNotificationConnector implements NotificationConnector {
  constructor(
    private readonly configEncryptionService: ConfigEncryptionService,
  ) {}

  async send(input: NotificationConnectorSendInput): Promise<NotificationConnectorSendResult> {
    const config = this.decryptConfig((input.config ?? {}) as SmtpConnectorConfig);
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

  private decryptConfig(config: SmtpConnectorConfig): SmtpConnectorConfig {
    if (typeof config.password !== "string" || config.password.length === 0) {
      return config;
    }

    return {
      ...config,
      password: this.configEncryptionService.decrypt(config.password),
    };
  }
}
