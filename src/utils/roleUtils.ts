import { UserRole } from '../types';

/**
 * Resolves the primary workspace destination based on the verified role.
 * Ensures strict role isolation:
 * - applicant -> /dashboard
 * - officer -> /officer
 * - administrator -> /admin
 */
export function getRoleRedirectPath(role?: UserRole | null, intendedPath?: string): string {
  if (role === 'officer') {
    if (intendedPath && intendedPath.startsWith('/officer')) return intendedPath;
    return '/officer';
  }
  if (role === 'administrator') {
    if (intendedPath && intendedPath.startsWith('/admin')) return intendedPath;
    return '/admin';
  }
  // Default for applicant
  if (
    intendedPath &&
    intendedPath !== '/login' &&
    intendedPath !== '/register' &&
    !intendedPath.startsWith('/officer') &&
    !intendedPath.startsWith('/admin')
  ) {
    return intendedPath;
  }
  return '/dashboard';
}
