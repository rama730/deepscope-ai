
export const peopleKeys = {
  all: ['people'] as const,
  lists: () => [...peopleKeys.all, 'list'] as const,
  list: (filters: {
    searchQuery?: string;
    locations?: string[];
    skills?: string[];
    projectTags?: string[];
  }) => [...peopleKeys.lists(), { 
    searchQuery: filters.searchQuery || "",
    locations: filters.locations || [],
    skills: filters.skills || [],
    projectTags: filters.projectTags || []
  }] as const,
};

export const explorerKeys = {
  all: ['explorer-feed'] as const,
  lists: () => [...explorerKeys.all, 'list'] as const,
  list: (filters: {
    feedType?: string;
    tab?: string;
    postType?: string;
    time?: string;
    sortBy?: string;
    searchQuery?: string;
    tag?: string;
  }) => [...explorerKeys.lists(), {
    feedType: filters.feedType || "explorer",
    tab: filters.tab || "for-you",
    postType: filters.postType || "all",
    time: filters.time || "all",
    sortBy: filters.sortBy || "newest",
    searchQuery: filters.searchQuery || "",
    tag: filters.tag || ""
  }] as const,
};

export const hubKeys = {
  all: ['hub-projects'] as const,
  lists: () => [...hubKeys.all, 'list'] as const,
  list: (view: string, filters: any) => [...hubKeys.lists(), view, filters] as const,
};

export const messageKeys = {
    all: ['messages-conversations'] as const,
    list: (userId: string) => [...messageKeys.all, userId] as const,
};

export const profileKeys = {
    all: ['profile'] as const,
    detail: (userId: string) => [...profileKeys.all, userId] as const,
};

export const notificationKeys = {
    all: ['notifications'] as const,
    lists: () => [...notificationKeys.all, 'list'] as const,
    list: (filters: {
        limit?: number;
        filter?: string;
        searchQuery?: string;
        sortBy?: string;
    }) => [...notificationKeys.lists(), {
        limit: filters.limit || 20,
        filter: filters.filter || "all",
        searchQuery: filters.searchQuery || "",
        sortBy: filters.sortBy || "newest"
    }] as const,
};

export const projectKeys = {
  all: ['project'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  activity: (id: string) => [...projectKeys.detail(id), 'activity'] as const,
  tasks: (id: string, filters?: any) => [...projectKeys.detail(id), 'tasks', filters] as const,
  files: (id: string) => [...projectKeys.detail(id), 'files'] as const,
  updates: (id: string) => [...projectKeys.detail(id), 'updates'] as const,
  sprints: (id: string) => [...projectKeys.detail(id), 'sprints'] as const,
  updateLinks: (id: string, updateIdsKey: string) => [...projectKeys.detail(id), 'updateLinks', updateIdsKey] as const,
};
