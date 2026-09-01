export type ProfileTabKey = "overview" | "portfolio" | "activity";

export type ConnectionState = "none" | "pending_outgoing" | "pending_incoming" | "accepted";

export type ProfileStats = {
  connectionsCount: number;
  projectsCount: number;
  followersCount: number;
};

export type ProfileDataSections = {
  skills: any[];
  experiences: any[];
  education: any[];
  projects: any[];
  socialLinks: any[];
};

export type ProfileViewer = {
  currentUser: any | null;
  isAuthenticated: boolean;
  isOwner: boolean;
  connectionStatus: ConnectionState;
  connectionPromise?: Promise<ConnectionState>;
};

export type ProfileViewModel = {
  profile: any;
  stats: ProfileStats;
  statsPromise?: Promise<ProfileStats>;
  // Optional because they might be loaded via promise
  data?: ProfileDataSections;
  posts?: any[];
  // Replaces immediate data for streaming scenarios
  detailsPromise?: Promise<any>;
  viewer: ProfileViewer;
};


