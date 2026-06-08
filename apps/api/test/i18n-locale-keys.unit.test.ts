import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditLocaleKeys } from './helpers/i18n-key-audit';

test('ru and en locale catalogs expose the same keys for core and modules', async () => {
  const audit = await auditLocaleKeys();

  assert.deepEqual(audit.core, {
    missingInLeft: [],
    missingInRight: []
  });

  assert.deepEqual(audit.modules.documents, {
    missingInLeft: [],
    missingInRight: []
  });
});
