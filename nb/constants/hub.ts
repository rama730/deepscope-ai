export const PROJECT_STATUS = {
  ALL: "all",
  IDEA: "Idea",
  IN_PROGRESS: "In Progress",
  LAUNCHED: "Launched",
} as const;

export const PROJECT_TYPE = {
  ALL: "all",
  WEB_APP: "Web App",
  MOBILE_APP: "Mobile App",
  LIBRARY: "Library",
  OTHER: "Other",
} as const;

export const SORT_OPTIONS = {
  NEWEST: "newest",
  POPULAR: "popular",
  ALPHABETICAL: "alphabetical",
  RECENT_ACTIVITY: "recent_activity",
  MOST_CONTRIBUTORS: "most_contributors",
  MOST_FOLLOWERS: "most_followers",
} as const;

export const FILTER_VIEWS = {
  ALL: "all",
  TRENDING: "trending",
  RECOMMENDATIONS: "recommendations",
  MY_PROJECTS: "my-projects",
  COLLECTION: "collection",
} as const;

export const VIEW_MODES = {
  GRID: "grid",
  LIST: "list",
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];
export type ProjectType = typeof PROJECT_TYPE[keyof typeof PROJECT_TYPE];
export type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS];
export type FilterView = typeof FILTER_VIEWS[keyof typeof FILTER_VIEWS];
export type ViewMode = typeof VIEW_MODES[keyof typeof VIEW_MODES];
