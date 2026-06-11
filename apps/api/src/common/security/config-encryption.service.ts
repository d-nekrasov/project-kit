import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const ENCRYPTED_VALUE_PREFIX = "enc:v1";
const MISSING_KEY_MESSAGE =
  "CONFIG_ENCRYPTION_KEY is required to store or read sensitive connector config.";
const INVALID_KEY_FORMAT_MESSAGE =
  "CONFIG_ENCRYPTION_KEY must be base64-encoded 32 bytes or a raw 32-byte string.";
const DECRYPTION_FAILED_MESSAGE =
  "Failed to decrypt sensitive connector config. CONFIG_ENCRYPTION_KEY is missing, invalid, or no longer matches the stored encrypted secrets.";

export class MissingConfigEncryptionKeyError extends Error {
  constructor(message = MISSING_KEY_MESSAGE) {
    super(message);
    this.name = "MissingConfigEncryptionKeyError";
  }
}

export class ConfigDecryptionError extends Error {
  constructor(message = DECRYPTION_FAILED_MESSAGE) {
    super(message);
    this.name = "ConfigDecryptionError";
  }
}

@Injectable()
export class ConfigEncryptionService {
  private readonly logger = new Logger(ConfigEncryptionService.name);
  private readonly key: Buffer | null;
  private readonly isProduction: boolean;

  constructor(private readonly configService: ConfigService) {
    this.isProduction =
      (this.configService.get<string>("APP_ENV") ?? "development").toLowerCase() ===
      "production";
    this.key = this.resolveKey(
      this.configService.get<string>("CONFIG_ENCRYPTION_KEY"),
    );

    if (!this.key) {
      const message = "CONFIG_ENCRYPTION_KEY is required and must decode to 32 bytes.";
      if (this.isProduction) {
        throw new MissingConfigEncryptionKeyError(message);
      }
      this.logger.warn(message);
    }
  }

  encrypt(plaintext: string): string {
    const key = this.getKeyOrThrow();
    const iv = randomBytes(12);
    const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    return [
      ENCRYPTED_VALUE_PREFIX,
      iv.toString("base64"),
      tag.toString("base64"),
      encrypted.toString("base64"),
    ].join(":");
  }

  decrypt(value: string): string {
    if (!this.isEncrypted(value)) {
      return value;
    }

    try {
      const [, , ivBase64, tagBase64, encryptedBase64] = value.split(":");
      const decipher = createDecipheriv(
        ENCRYPTION_ALGORITHM,
        this.getKeyOrThrow(),
        Buffer.from(ivBase64, "base64"),
      );
      decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

      const decrypted = Buffer.concat([
        decipher.update(Buffer.from(encryptedBase64, "base64")),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
    } catch (error) {
      if (error instanceof MissingConfigEncryptionKeyError) {
        throw error;
      }

      throw new ConfigDecryptionError();
    }
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(`${ENCRYPTED_VALUE_PREFIX}:`);
  }

  private getKeyOrThrow(): Buffer {
    if (!this.key) {
      throw new MissingConfigEncryptionKeyError();
    }
    return this.key;
  }

  private resolveKey(value: string | undefined): Buffer | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }

    const base64Decoded = Buffer.from(normalized, "base64");
    if (
      base64Decoded.length === 32 &&
      base64Decoded.toString("base64").replace(/=+$/, "") ===
        normalized.replace(/=+$/, "")
    ) {
      return base64Decoded;
    }

    const utf8Buffer = Buffer.from(normalized, "utf8");
    if (utf8Buffer.length === 32) {
      return utf8Buffer;
    }

    throw new Error(INVALID_KEY_FORMAT_MESSAGE);
  }
}
