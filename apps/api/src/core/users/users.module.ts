import { Module } from '@nestjs/common';
import { CasbinModule } from '../../infrastructure/casbin/casbin.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [CasbinModule],
  controllers: [UsersController],
  providers: [UsersService]
})
export class UsersModule {}
