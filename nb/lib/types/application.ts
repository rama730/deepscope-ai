export interface Application {
  id: string;
  project_id: string;
  applicant_id: string;
  role_applied_for: string;
  message: string;
  status: "pending" | "accepted" | "rejected" | "withdrawn";
  created_at: string;
  conversation_id?: string;
  rejection_message?: string | null;
  rejected_at?: string | null;
  work_timings?: string | null;
  portfolio_link?: string | null;
  applicant_profile?: {
    full_name: string | null;
    username: string | null;
    id: string;
    avatar_url?: string | null; // Added as it's often useful
  };
  project?: {
    title: string;
    slug?: string;
    creator_id?: string;
    logo_url?: string | null; // Added for display
  };
}
