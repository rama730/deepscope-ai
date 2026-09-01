import { createSupabaseServerClient } from "@/lib/supabase/server";
import PeopleHubClient from "@/components/people/PeopleHubClient";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";


interface PeoplePageProps {
  searchParams?: {
    tab?: string;
    q?: string;
    skills?: string;
    location?: string;
    tags?: string;
  };
  forcedTab?: string;
}

async function PeoplePageContent({ searchParams, forcedTab }: PeoplePageProps) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const tab = (forcedTab || searchParams?.tab || "discover").toLowerCase();

  // Base promises that might be needed
  let profilesPromise: Promise<any> | undefined;
  let facetsPromise: Promise<any> | undefined;
  let connectionsPromise: Promise<any> | undefined; // For initial load only
  let inboxPromise: Promise<any> | undefined;

  // 1. DISCOVER TAB (Default)
  if (tab === "discover") {
    // Parse filters from searchParams
    const q = (searchParams?.q || "").trim();
    const skillList = searchParams?.skills ? (searchParams.skills as string).split("|") : [];
    const locationList = searchParams?.location ? (searchParams.location as string).split("|") : [];
    const projectTagList = searchParams?.tags ? (searchParams.tags as string).split("|") : [];

    // Pagination
    const limit = 50;

    // Helper to execute query, possibly with FTS or fallback
    const fetchProfiles = async () => {
      // 1. Try with Full Text Search if query exists
      if (q) {
        let ftsQuery = supabase
          .from("profiles")
          .select(`
            id, username, full_name, avatar_url, bio, location, created_at,
            skills!inner (skill_name),
            created_projects: projects!creator_id (id, title, slug, status, technologies_used, updated_at),
            collab_projects: project_collaborators (role, project: projects (id, title, slug, status, technologies_used))
          `)
          .order("created_at", { ascending: false })
          .limit(limit);

        if (user) ftsQuery = ftsQuery.neq("id", user.id);

        // Apply shared filters
        if (locationList.length > 0) ftsQuery = ftsQuery.in("location", locationList);
        if (skillList.length > 0) {
          const formattedSkills = `(${skillList.map(s => `"${s}"`).join(',')})`;
          ftsQuery = ftsQuery.filter('skills.skill_name', 'in', formattedSkills);
        }

        // Apply FTS
        // We use 'plain' config to handle spaces as AND/OR appropriately or just simple text
        ftsQuery = ftsQuery.textSearch('search_vector', q, { config: 'english', type: 'websearch' });

        const { data, error } = await ftsQuery;

        // If successful and found results (or just successful), return
        // If error code is related to missing column (42703), fallback.
        if (!error) return { data, error: null };

        // Check for specific error codes if possible, or just fallback if any error
        // 42703 = undefined_column
        const errCode = (error as any).code;
        if (errCode === '42703' || (error.message && error.message.includes("search_vector"))) {
          console.warn("FTS failed (migration missing?), falling back to ilike");
          // Fallthrough to standard query
        } else {
          // Real error
          return { data: null, error };
        }
      }

      // 2. Standard Query (Fallback or no query)
      let query = supabase
        .from("profiles")
        .select(`
            id, username, full_name, avatar_url, bio, location, created_at,
            skills!inner (skill_name),
            created_projects: projects!creator_id (id, title, slug, status, technologies_used, updated_at),
            collab_projects: project_collaborators (role, project: projects (id, title, slug, status, technologies_used))
          `)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (user) query = query.neq("id", user.id);

      if (q) {
        query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%,bio.ilike.%${q}%,location.ilike.%${q}%`);
      }
      if (locationList.length > 0) query = query.in("location", locationList);
      if (skillList.length > 0) {
        const formattedSkills = `(${skillList.map(s => `"${s}"`).join(',')})`;
        query = query.filter('skills.skill_name', 'in', formattedSkills);
      }

      return await query;
    };

    profilesPromise = fetchProfiles().then(({ data, error }) => {
      if (error) {
        console.error("Error fetching profiles:", error);
        return [];
      }

      // Client-side mapping for project tags (since filtering nested-nested is hard on server efficiently without RPC)
      if (projectTagList.length > 0) {
        return (data || []).filter((p: any) => {
          const allTags = new Set<string>();
          p.created_projects?.forEach((proj: any) => {
            if (Array.isArray(proj.technologies_used)) proj.technologies_used.forEach((t: string) => allTags.add(t.toLowerCase()));
          });
          return projectTagList.some(tag => allTags.has(tag.toLowerCase()));
        });
      }
      return data || [];
    }) as unknown as Promise<any>;

    facetsPromise = Promise.all([
      supabase.from("projects").select("tags").order("created_at", { ascending: false }).limit(100),
      supabase.from("skills").select("skill_name").limit(150),
      supabase.from("profiles").select("location").not("location", "is", null).limit(100)
    ]).then(([tagAgg, skillsAgg, profilesAgg]) => {
      const tagCount: Record<string, number> = {};
      if (tagAgg.data) {
        for (const p of tagAgg.data) {
          if (Array.isArray(p.tags)) {
            for (const t of p.tags) {
              const key = (t || "").trim();
              if (key) tagCount[key] = (tagCount[key] || 0) + 1;
            }
          }
        }
      }
      const projectTags = Object.entries(tagCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([label, count]) => ({ label, count }));

      const skillCount: Record<string, number> = {};
      if (skillsAgg.data) {
        for (const s of skillsAgg.data) {
          const key = (s.skill_name || "").trim();
          if (key) skillCount[key] = (skillCount[key] || 0) + 1;
        }
      }
      const skills = Object.entries(skillCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 16)
        .map(([label, count]) => ({ label, count }));

      const locationCount: Record<string, number> = {};
      if (profilesAgg.data) {
        for (const p of profilesAgg.data) {
          const key = (p.location || "").trim();
          if (key) locationCount[key] = (locationCount[key] || 0) + 1;
        }
      }
      const locations = Object.entries(locationCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([label, count]) => ({ label, count }));

      return { projectTags, skills, locations };
    }) as unknown as Promise<any>;

    // We also need connections ID list to show "Connect" vs "Pending" status on cards
    if (user) {
      connectionsPromise = supabase
        .from("connections")
        .select("id, user_id, connected_user_id, status")
        .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)
        .then(res => res.data) as unknown as Promise<any>;
    }
  }

  // 2. NETWORK TAB
  if (tab === "network" && user) {
    // Connections and stats are now handled by client-side store (useConnectionStore)
    // No server-side fetching needed here.
  }

  // 3. INBOX TAB
  if (tab === "inbox" && user) {
    inboxPromise = (async () => {
      const [incomingConn, incomingProj, sentProj] = await Promise.all([
        supabase
          .from("connections")
          .select(`id, user_id, connected_user_id, status, created_at, profiles:user_id(id, username, full_name, avatar_url, bio)`)
          .eq("connected_user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("project_invitations")
          .select(`
            id,
            project_id,
            inviter_id,
            invitee_id,
            role,
            status,
            created_at,
            project:projects!project_invitations_project_id_fkey(id, title, slug),
            inviter:profiles!project_invitations_inviter_id_fkey(id, username, full_name, avatar_url)
          `)
          .eq("invitee_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(25),
        supabase
          .from("project_invitations")
          .select(`
            id,
            project_id,
            inviter_id,
            invitee_id,
            role,
            status,
            created_at,
            project:projects!project_invitations_project_id_fkey(id, title, slug),
            invitee:profiles!project_invitations_invitee_id_fkey(id, username, full_name, avatar_url)
          `)
          .eq("inviter_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(25)
      ]);

      return {
        incomingConnectionRequests: incomingConn.data || [],
        incomingProjectInvites: incomingProj.data || [],
        sentProjectInvites: sentProj.data || [],
      };
    })();
  }

  return (
    <PeopleHubClient
      initialUser={user}
      activeTabOverride={tab}
      profilesPromise={profilesPromise}
      facetsPromise={facetsPromise}
      connectionsPromise={connectionsPromise}
      inboxPromise={inboxPromise}
    />
  );
}

export default function PeoplePage(props: PeoplePageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-2" size={32} />
          <p className="text-sm text-zinc-500">Loading people...</p>
        </div>
      </div>
    }>
      <PeoplePageContent {...props} />
    </Suspense>
  );
}
