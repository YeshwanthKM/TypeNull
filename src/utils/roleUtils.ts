import { UserRole } from '../types';

/**
 * User-facing display labels mapped from internal UserRole identifiers.
 * 
 * Internal Identifiers (Security Boundary):
 * - 'applicant': Standard user preparing applications and dossiers
 * - 'officer': Organisation member performing screening and evaluation
 * - 'administrator': System administrator managing users and platform governance
 * 
 * User-Facing Display Labels:
 * - 'applicant'     -> "User"
 * - 'officer'       -> "Organisation"
 * - 'administrator' -> "Admin"
 * 
 * NOTE: Display labels must NEVER be used as the security or authorization boundary.
 */
export const ROLE_DISPLAY_LABELS: Record<UserRole, string> = {
  applicant: 'User',
  officer: 'Organisation',
  administrator: 'Admin',
};

/**
 * Returns the polished, user-facing label for a given internal role.
 */
export function getRoleDisplayLabel(role?: UserRole | string | null): string {
  if (!role) return 'User';
  if (role in ROLE_DISPLAY_LABELS) {
    return ROLE_DISPLAY_LABELS[role as UserRole];
  }
  // Fallback capitalization
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Returns role badge styling classes for consistent design system presentation.
 */
export function getRoleBadgeStyle(role?: UserRole | string | null): {
  bg: string;
  text: string;
  border: string;
} {
  switch (role) {
    case 'administrator':
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-800',
        border: 'border-indigo-200',
      };
    case 'officer':
      return {
        bg: 'bg-teal-50',
        text: 'text-teal-800',
        border: 'border-teal-200',
      };
    case 'applicant':
    default:
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-800',
        border: 'border-slate-200',
      };
  }
}

/**
 * Computes destination route for an authenticated user based on role and intended path.
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
    intendedPath !== '/' &&
    !intendedPath.startsWith('/login') &&
    !intendedPath.startsWith('/register')
  ) {
    return intendedPath;
  }
  return '/dashboard';
}
