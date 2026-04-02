/**
 * RBAC (Role-Based Access Control) Configuration
 * Centralized role definitions, permissions, and navigation config.
 */

export const ROLES = {
  CITIZEN: "citizen",
  RESCUER: "rescuer",
  ADMIN: "admin",
};

/**
 * All navigation items with role restrictions.
 * `roles` = which roles can see this item.
 * `mobileNav` = whether to show in the mobile bottom nav bar.
 */
const ALL_NAV_ITEMS = [
  // ── Shared ──
  { icon: "dashboard", label: "Dashboard", labelKey: "nav.dashboard", page: "dashboard", roles: [ROLES.CITIZEN], mobileNav: true },
  { icon: "map", label: "Live Flood Map", labelKey: "nav.map", page: "map", filled: true, roles: [ROLES.CITIZEN, ROLES.RESCUER], mobileNav: true },

  // ── Citizen ──
  { icon: "sos", label: "SOS Request", labelKey: "nav.sos", page: "sos", roles: [ROLES.CITIZEN], mobileNav: true },

  // ── Rescuer ──
  { icon: "emergency", label: "Rescue Requests", labelKey: "nav.rescue", page: "rescue", badge: null, roles: [ROLES.RESCUER], mobileNav: true },
  { icon: "assignment_ind", label: "Rescuer Dashboard", labelKey: "nav.rescuer-dashboard", page: "rescuer-dashboard", roles: [ROLES.RESCUER], mobileNav: false },

  // ── Shared (citizen + rescuer) ──
  { icon: "newspaper", label: "News & Alerts", labelKey: "nav.news", page: "news", roles: [], mobileNav: false },
  { icon: "shield_with_heart", label: "Safety Protocols", labelKey: "nav.safety", page: "safety", roles: [ROLES.CITIZEN], mobileNav: true },
  { icon: "info", label: "About Us", labelKey: "nav.about", page: "about", roles: [], mobileNav: false },

  // ── Admin ──
  { icon: "admin_panel_settings", label: "Admin Dashboard", labelKey: "nav.admin", page: "admin", roles: [ROLES.ADMIN], mobileNav: true },
  { icon: "emergency", label: "SOS Requests", labelKey: "nav.admin-requests", page: "admin-requests", roles: [ROLES.ADMIN], mobileNav: true },
  { icon: "group", label: "User Management", labelKey: "nav.admin-users", page: "admin-users", roles: [ROLES.ADMIN], mobileNav: true },
  { icon: "local_fire_department", label: "Rescue Teams", labelKey: "nav.admin-teams", page: "admin-teams", roles: [ROLES.ADMIN], mobileNav: false },
  { icon: "sensors", label: "Flood Sensors", labelKey: "nav.admin-sensors", page: "admin-sensors", roles: [ROLES.ADMIN], mobileNav: false },
  { icon: "analytics", label: "System Analytics", labelKey: "nav.admin-analytics", page: "admin-analytics", roles: [ROLES.ADMIN], mobileNav: false },
];

/**
 * Get navigation items visible to a specific role.
 * @param {string} role
 * @returns {Array} filtered nav items
 */
export function getNavItemsForRole(role) {
  if (!role) return [];
  return ALL_NAV_ITEMS.filter((item) => item.roles.includes(role));
}

/**
 * Get mobile bottom-nav items visible to a specific role.
 * Limited to 5 items max for mobile UX.
 * @param {string} role
 * @returns {Array}
 */
export function getMobileNavItemsForRole(role) {
  if (!role) return [];
  return ALL_NAV_ITEMS.filter((item) => item.roles.includes(role) && item.mobileNav).slice(0, 5);
}

/**
 * Check if a role has access to a specific page.
 * @param {string} role
 * @param {string} page
 * @returns {boolean}
 */
export function canAccessPage(role, page) {
  const item = ALL_NAV_ITEMS.find((i) => i.page === page);
  if (!item) return true; // pages not in nav are accessible by all
  return item.roles.includes(role);
}

/**
 * Get display label for a role.
 * @param {string} role
 * @returns {string}
 */
export function getRoleLabel(role) {
  switch (role) {
    case ROLES.ADMIN:
      return "System Administrator";
    case ROLES.RESCUER:
      return "Rescue Team";
    case ROLES.CITIZEN:
      return "Citizen";
    default:
      return "User";
  }
}

/**
 * Get role badge color classes.
 * @param {string} role
 * @returns {string} Tailwind classes
 */
export function getRoleBadgeClasses(role) {
  switch (role) {
    case ROLES.ADMIN:
      return "bg-danger/10 text-danger border-danger/20";
    case ROLES.RESCUER:
      return "bg-warning/10 text-warning border-warning/20";
    case ROLES.CITIZEN:
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-slate-100 text-slate-500 border-slate-200";
  }
}
