export function parsePermissionCode(code: string): { resource: string; action: string } {
  const separatorIndex = code.indexOf('.');
  if (separatorIndex <= 0 || separatorIndex === code.length - 1) {
    throw new Error(`Invalid permission code: ${code}`);
  }

  const resource = code.slice(0, separatorIndex);
  const action = code.slice(separatorIndex + 1);
  if (!resource || !action) {
    throw new Error(`Invalid permission code: ${code}`);
  }

  return { resource, action };
}
