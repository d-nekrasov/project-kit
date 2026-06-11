import { Module } from "@nestjs/common";
import { ConfigEncryptionService } from "./config-encryption.service";

@Module({
  providers: [ConfigEncryptionService],
  exports: [ConfigEncryptionService],
})
export class ConfigEncryptionModule {}
