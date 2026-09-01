export const STALE_TIMES = {
  REALTIME: 0,           // 0s - Always fresh
  VOLATILE: 1000 * 30,   // 30s - High frequency updates (activity logs)
  SHORT: 1000 * 60,      // 1m - Tasks, Notifications
  MEDIUM: 1000 * 60 * 5, // 5m - Files, Hub Projects (Increased for better hit rate)
  STANDARD: 1000 * 60 * 10, // 10m - Profiles, Project Lists (Default - highly cached)
  LONG: 1000 * 60 * 60 * 24,  // 24h - Static-ish data (Configurations, hardly changes)
};
