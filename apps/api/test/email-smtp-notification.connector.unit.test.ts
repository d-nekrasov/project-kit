import assert from "node:assert/strict";
import { test } from "node:test";

import { NotificationChannel } from "@prisma/client";
import { ConfigService } from "@nestjs/config";
import nodemailer from "nodemailer";

import { ConfigEncryptionService } from "../src/common/security/config-encryption.service";
import { EmailSmtpNotificationConnector } from "../src/core/notifications/connectors/email-smtp-notification.connector";

const configEncryptionKey = "MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=";
const rotatedConfigEncryptionKey = "abcdefghijklmnopqrstuvwxyzABCDEF";

test("EmailSmtpNotificationConnector decrypts SMTP passwords only inside backend runtime", async () => {
  const configEncryptionService = new ConfigEncryptionService(
    new ConfigService({
      APP_ENV: "test",
      CONFIG_ENCRYPTION_KEY: configEncryptionKey,
    }),
  );
  const connector = new EmailSmtpNotificationConnector(configEncryptionService);
  const encryptedPassword = configEncryptionService.encrypt("SuperSecret123!");

  let capturedPassword = "";
  const originalCreateTransport = nodemailer.createTransport;
  nodemailer.createTransport = ((options: { auth?: { pass?: string } }) =>
    ({
      sendMail: async () => {
        capturedPassword = options.auth?.pass ?? "";
      },
    }) as any) as typeof nodemailer.createTransport;

  try {
    const result = await connector.send({
      channel: NotificationChannel.EMAIL,
      to: "user@example.com",
      subject: "Hello",
      body: "Body",
      config: {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        username: "smtp-user",
        password: encryptedPassword,
        from: "no-reply@example.com",
      },
    });

    assert.equal(result.ok, true);
    assert.equal(capturedPassword, "SuperSecret123!");
  } finally {
    nodemailer.createTransport = originalCreateTransport;
  }
});

test("EmailSmtpNotificationConnector returns a clear error when encrypted SMTP secrets cannot be decrypted", async () => {
  const originalService = new ConfigEncryptionService(
    new ConfigService({
      APP_ENV: "test",
      CONFIG_ENCRYPTION_KEY: configEncryptionKey,
    }),
  );
  const rotatedService = new ConfigEncryptionService(
    new ConfigService({
      APP_ENV: "test",
      CONFIG_ENCRYPTION_KEY: rotatedConfigEncryptionKey,
    }),
  );
  const connector = new EmailSmtpNotificationConnector(rotatedService);

  const result = await connector.send({
    channel: NotificationChannel.EMAIL,
    to: "user@example.com",
    subject: "Hello",
    body: "Body",
    config: {
      host: "smtp.example.com",
      port: 587,
      secure: false,
      username: "smtp-user",
      password: originalService.encrypt("SuperSecret123!"),
      from: "no-reply@example.com",
    },
  });

  assert.equal(result.ok, false);
  assert.match(
    result.error ?? "",
    /Failed to decrypt sensitive connector config/,
  );
});
