import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Enforcer, newEnforcer } from 'casbin';

@Injectable()
export class CasbinService implements OnModuleInit {
  private enforcer: Enforcer | null = null;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const modelPath = this.configService.get<string>('CASBIN_MODEL_PATH') || './src/infrastructure/casbin/model.conf';
    this.enforcer = await newEnforcer(modelPath);
    // TODO: sync policies from Role/Permission storage once RBAC domain logic is implemented.
  }

  getEnforcer(): Enforcer {
    if (!this.enforcer) {
      throw new Error('Casbin enforcer is not initialized');
    }
    return this.enforcer;
  }
}
