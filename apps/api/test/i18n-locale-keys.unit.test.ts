import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditLocaleKeys } from './helpers/i18n-key-audit';

test('ru and en locale catalogs expose the same keys for core and modules', async () => {
  const audit = await auditLocaleKeys();

  assert.deepEqual(
    {
      missingInLeft: audit.core.missingInLeft,
      missingInRight: audit.core.missingInRight
    },
    {
      missingInLeft: [],
      missingInRight: []
    }
  );

  assert.deepEqual(audit.modules.documents, {
    missingInLeft: [],
    missingInRight: []
  });
});

test('core locale catalogs no longer expose modulesPage namespace', async () => {
  const audit = await auditLocaleKeys();

  assert.deepEqual(audit.core.ruKeys.filter((key) => key.startsWith('modulesPage.')), []);
  assert.deepEqual(audit.core.enKeys.filter((key) => key.startsWith('modulesPage.')), []);
});
