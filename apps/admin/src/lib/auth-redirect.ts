const PUBLIC_AUTH_PATHS = new Set(['/login', '/forgot-password', '/reset-password', '/install']);

export function isPublicAuthPath(pathname: string): boolean {
  return PUBLIC_AUTH_PATHS.has(pathname);
}

export function shouldRedirectToLogin(pathname: string): boolean {
  return !isPublicAuthPath(pathname);
}
