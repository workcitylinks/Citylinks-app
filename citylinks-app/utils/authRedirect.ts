/**
 * authRedirect.ts
 * Determines the exact particular logged-in screen where the user must be redirected.
 *
 * Rules:
 * 1. If an explicit redirect param is provided (e.g. from /cart, /book-transport, /services, etc.),
 *    return that screen path immediately.
 * 2. Otherwise, route the user to their specific dedicated role dashboard:
 *    - SUPER_ADMIN -> /admin-approvals
 *    - MERCHANT -> /merchant-dashboard
 *    - TRANSPORT -> /transport-dashboard
 *    - MANUAL_SERVICE_PROVIDER -> /manual-service-dashboard
 *    - DIGITAL_SERVICE_PROVIDER -> /digital-service-dashboard
 *    - CUSTOMER -> / (Home)
 */
export function getParticularLoggedPage(user: any, redirectParam?: string | string[] | null): string {
  const targetParam = Array.isArray(redirectParam) ? redirectParam[0] : redirectParam;
  if (targetParam && typeof targetParam === 'string' && targetParam.startsWith('/') && targetParam !== '/auth') {
    return targetParam;
  }

  const role = String(user?.role || '').toUpperCase().trim();

  switch (role) {
    case 'SUPER_ADMIN':
      return '/'; // Super Admin lands directly on the Home page
    case 'MERCHANT':
      return '/merchant-dashboard';
    case 'TRANSPORT':
      return '/transport-dashboard';
    case 'MANUAL_SERVICE_PROVIDER':
      return '/manual-service-dashboard';
    case 'DIGITAL_SERVICE_PROVIDER':
      return '/digital-service-dashboard';
    case 'CUSTOMER':
    default:
      return '/';
  }
}
