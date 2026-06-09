import assert from 'node:assert/strict';
import { test } from 'node:test';
import { auditLocaleKeys } from './helpers/i18n-key-audit';

test('ru and en locale catalogs expose the same keys for all core and module JSON files', async () => {
  const audit = await auditLocaleKeys();
  const problems: string[] = [];

  collectNamespaceProblems(problems, 'core', audit.core);

  for (const [moduleName, moduleAudit] of Object.entries(audit.modules)) {
    if (!moduleAudit.files.length && !moduleAudit.missingLocales.length) {
      continue;
    }

    collectNamespaceProblems(problems, `module:${moduleName}`, moduleAudit);
  }

  assert.deepEqual(problems, []);
});

test('core locale catalogs no longer expose modulesPage namespace', async () => {
  const audit = await auditLocaleKeys();

  assert.deepEqual(audit.core.ruKeys.filter((key) => key.startsWith('modulesPage.')), []);
  assert.deepEqual(audit.core.enKeys.filter((key) => key.startsWith('modulesPage.')), []);
});

function collectNamespaceProblems(
  problems: string[],
  label: string,
  audit: {
    missingLocales: string[];
    files: Array<{ file: string; missingLocales: string[]; diff: { missingInLeft: string[]; missingInRight: string[] } }>;
    diff: { missingInLeft: string[]; missingInRight: string[] };
  }
) {
  if (audit.missingLocales.length) {
    problems.push(`${label} missing locale directories: ${audit.missingLocales.join(', ')}`);
  }

  if (audit.diff.missingInLeft.length) {
    problems.push(`${label} missing in ru catalog: ${audit.diff.missingInLeft.join(', ')}`);
  }

  if (audit.diff.missingInRight.length) {
    problems.push(`${label} missing in en catalog: ${audit.diff.missingInRight.join(', ')}`);
  }

  for (const fileAudit of audit.files) {
    if (fileAudit.missingLocales.length) {
      problems.push(`${label}/${fileAudit.file} missing locale files: ${fileAudit.missingLocales.join(', ')}`);
    }

    if (fileAudit.diff.missingInLeft.length) {
      problems.push(`${label}/${fileAudit.file} missing in ru: ${fileAudit.diff.missingInLeft.join(', ')}`);
    }

    if (fileAudit.diff.missingInRight.length) {
      problems.push(`${label}/${fileAudit.file} missing in en: ${fileAudit.diff.missingInRight.join(', ')}`);
    }
  }
}
