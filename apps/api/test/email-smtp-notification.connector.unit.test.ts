import assert from "node:assert/strict";
import { test } from "node:test";

import { NotificationChannel } from "@prisma/client";
import nodemailer from "nodemailer";

import { EmailSmtpNotificationConnector } from "../src/core/notifications/connectors/email-smtp-notification.connector";
import {
  createConfigEncryptionService,
  generateConfigEncryptionKey,
} from "./helpers/config-encryption";

const configEncryptionKey = generateConfigEncryptionKey();
const rotatedConfigEncryptionKey = generateConfigEncryptionKey();

test("EmailSmtpNotificationConnector decrypts SMTP passwords only inside backend runtime", async () => {
  const configEncryptionService = createConfigEncryptionService({
    configEncryptionKey,
  });
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
  const originalService = createConfigEncryptionService({
    configEncryptionKey,
  });
  const rotatedService = createConfigEncryptionService({
    configEncryptionKey: rotatedConfigEncryptionKey,
  });
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
