import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  NotificationChannel,
  NotificationConnectorStatus,
  SystemLogLevel,
} from "@prisma/client";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { EmailSmtpNotificationConnector } from "../notifications/connectors/email-smtp-notification.connector";
import {
  NOTIFICATION_CONNECTOR_CODES,
  NOTIFICATION_EVENTS,
} from "../notifications/constants/notification-events.constants";
import { renderNotificationTemplate } from "../notifications/utils/render-notification-template";
import { SYSTEM_LOG_EVENTS } from "../system-logs/constants/system-log-events.constants";
import { SYSTEM_LOG_SOURCES } from "../system-logs/constants/system-log-sources.constants";
import { SystemLogsService } from "../system-logs/system-logs.service";

@Injectable()
export class AuthPasswordResetMailService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly emailConnector: EmailSmtpNotificationConnector,
    private readonly systemLogsService: SystemLogsService,
  ) {}

  async sendPasswordResetEmail(input: {
    userId: string;
    email: string;
    token: string;
    expiresAt: Date;
  }): Promise<{ delivered: boolean }> {
    const resetUrl = this.configService
      .get<string>("AUTH_PASSWORD_RESET_URL")
      ?.trim();
    if (!resetUrl) {
      await this.writeFailureLog(
        "Password reset email skipped because AUTH_PASSWORD_RESET_URL is not configured",
        {
          event: SYSTEM_LOG_EVENTS.NOTIFICATION_SEND_FAILED,
          userId: input.userId,
        },
      );
      return { delivered: false };
    }

    const connector = await this.prisma.notificationConnector.findUnique({
      where: { code: NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL },
      select: { status: true, config: true },
    });

    if (
      !connector ||
      connector.status !== NotificationConnectorStatus.ENABLED
    ) {
      await this.writeFailureLog(
        "Password reset email skipped because SMTP connector is disabled",
        {
          event: SYSTEM_LOG_EVENTS.NOTIFICATION_CONNECTOR_FAILED,
          userId: input.userId,
          connectorCode: NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL,
        },
      );
      return { delivered: false };
    }

    let link: string;
    try {
      link = this.buildResetLink(resetUrl, input.token);
    } catch (error) {
      await this.writeFailureLog(
        "Password reset email skipped because AUTH_PASSWORD_RESET_URL is invalid",
        {
          event: SYSTEM_LOG_EVENTS.NOTIFICATION_SEND_FAILED,
          userId: input.userId,
          errorStack:
            error instanceof Error
              ? (error.stack ?? error.message)
              : String(error),
        },
      );
      return { delivered: false };
    }

    const ttlMinutes = Math.max(
      1,
      Math.ceil((input.expiresAt.getTime() - Date.now()) / (60 * 1000)),
    );

    const template = await this.prisma.notificationTemplate.findUnique({
      where: { event: NOTIFICATION_EVENTS.AUTH_PASSWORD_RESET_REQUESTED },
      select: {
        emailSubject: true,
        emailBody: true,
      },
    });

    const payload = {
      email: input.email,
      expiresInMinutes: ttlMinutes,
      resetLink: link,
    } satisfies Record<string, string | number>;

    const rendered = await this.renderPasswordResetTemplate(
      input.userId,
      template,
      payload,
    );

    try {
      const result = await this.emailConnector.send({
        channel: NotificationChannel.EMAIL,
        to: input.email,
        subject: rendered.subject,
        body: rendered.body,
        config: connector.config as Record<string, unknown> | null,
      });

      if (!result.ok) {
        await this.writeFailureLog("Password reset email delivery failed", {
          event: SYSTEM_LOG_EVENTS.NOTIFICATION_DELIVERY_FAILED,
          userId: input.userId,
          connectorCode: NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL,
          error: result.error ?? "SMTP delivery failed",
        });
        return { delivered: false };
      }
    } catch (error) {
      await this.writeFailureLog("Password reset email delivery failed", {
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_DELIVERY_FAILED,
        userId: input.userId,
        connectorCode: NOTIFICATION_CONNECTOR_CODES.SMTP_EMAIL,
        errorStack:
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error),
      });
      return { delivered: false };
    }

    return { delivered: true };
  }

  private buildResetLink(resetUrl: string, token: string): string {
    const url = new URL(resetUrl);
    url.searchParams.set("token", token);
    return url.toString();
  }

  private async renderPasswordResetTemplate(
    userId: string,
    template: { emailSubject: string | null; emailBody: string | null } | null,
    payload: Record<string, unknown>,
  ): Promise<{ subject: string; body: string }> {
    const fallbackSubject = "Reset your password";
    const fallbackBody = [
      "We received a request to reset the password for {{email}}.",
      "",
      "Use this link to choose a new password:",
      "{{resetLink}}",
      "",
      "This link expires in {{expiresInMinutes}} minute(s).",
      "",
      "If you did not request a password reset, you can ignore this email.",
    ].join("\n");

    try {
      return {
        subject: renderNotificationTemplate(
          template?.emailSubject ?? fallbackSubject,
          payload,
        ),
        body: renderNotificationTemplate(template?.emailBody ?? fallbackBody, payload),
      };
    } catch (error) {
      await this.writeFailureLog("Password reset email template render failed", {
        event: SYSTEM_LOG_EVENTS.NOTIFICATION_TEMPLATE_RENDER_FAILED,
        userId,
        errorStack:
          error instanceof Error
            ? (error.stack ?? error.message)
            : String(error),
      });

      return {
        subject: renderNotificationTemplate(fallbackSubject, payload),
        body: renderNotificationTemplate(fallbackBody, payload),
      };
    }
  }

  private async writeFailureLog(
    message: string,
    context: {
      event: string;
      userId: string;
      connectorCode?: string;
      error?: string;
      errorStack?: string;
    },
  ): Promise<void> {
    await this.systemLogsService.write({
      level: SystemLogLevel.ERROR,
      source: SYSTEM_LOG_SOURCES.AUTH,
      message,
      context: {
        event: context.event,
        flow: "password_reset",
        ...(context.connectorCode
          ? { connectorCode: context.connectorCode }
          : {}),
        ...(context.error ? { error: context.error } : {}),
      },
      errorStack: context.errorStack,
      userId: context.userId,
    });
  }
}
