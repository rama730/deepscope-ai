export interface Profile {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  headline?: string | null;
}

export interface Connection {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'blocked';
  accepted_at: string | null;
  created_at: string;
  profiles?: Profile;
  connected_profiles?: Profile;
  // Computed on client/server for display convenience
  otherUser?: Profile;
}

export interface ConnectionRequest {
  id: string;
  user_id: string;
  connected_user_id: string;
  status: 'pending';
  created_at: string;
  profiles: Profile; // The sender's profile
}

export interface ProjectInvite {
  id: string;
  project_id: string;
  inviter_id: string;
  invitee_id: string;
  role: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  project: {
    id: string;
    title: string;
    slug: string;
  };
  inviter?: Profile;
  invitee?: Profile;
}

export interface InboxData {
  incomingConnectionRequests: ConnectionRequest[];
  incomingProjectInvites: ProjectInvite[];
  sentProjectInvites: ProjectInvite[];
}

export interface ConnectionStats {
  total_connections: number;
  pending_incoming: number;
  pending_outgoing: number;
  connections_this_month: number;
}
