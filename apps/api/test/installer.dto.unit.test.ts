import assert from 'node:assert/strict';
import { test } from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SetupInstallerDto } from '../src/core/installer/dto/setup-installer.dto';

const validPayload = {
  appName: 'Project Kit',
  organizationName: 'Default Organization',
  organizationSlug: 'default',
  adminEmail: 'admin@example.com',
  adminPassword: 'AdminPassword123!',
  adminName: 'Admin'
};

test('SetupInstallerDto rejects unsupported locale', async () => {
  const dto = plainToInstance(SetupInstallerDto, {
    ...validPayload,
    locale: 'de'
  });

  const errors = await validate(dto);

  assert.ok(errors.some((error) => error.property === 'locale'));
});
