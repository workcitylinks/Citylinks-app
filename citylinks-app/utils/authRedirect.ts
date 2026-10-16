/**
 * authRedirect.ts
 * Determines the exact screen where the user must be redirected upon login.
 *
 * Requirements:
 * Always open the main home page ('/') for all users regardless of their role
 * (Merchant, Driver/Transport, Technical/Manual Service, Digital Specialist,
 * Super Admin, Customer).
 *
 * Only redirects to a specific screen if the user had an active in-flow intent
 * (e.g. they were in /cart or /orders and had to log in to complete their action).
 */
export function getParticularLoggedPage(user?: any, redirectParam?: string | string[] | null): string {
  const targetParam = Array.isArray(redirectParam) ? redirectParam[0] : redirectParam;

  // Never automatically redirect into internal role dashboards or auth screens on login
  const DISALLOWED_DEFAULT_ROUTES = [
    '/auth',
    '/oauthredirect',
    '/merchant-dashboard',
    '/transport-dashboard',
    '/manual-service-dashboard',
    '/digital-service-dashboard',
    '/admin-approvals',
    '/admin-deals',
    '/admin-sponsored',
    '/admin-notification',
  ];

  if (
    targetParam &&
    typeof targetParam === 'string' &&
    targetParam.startsWith('/') &&
    !DISALLOWED_DEFAULT_ROUTES.includes(targetParam)
  ) {
    return targetParam;
  }

  // Always open the main home page ('/') for all roles
  return '/';
}
