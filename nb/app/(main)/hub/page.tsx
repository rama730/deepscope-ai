// import { createSupabaseServerClient } from "@/lib/supabase/server"; // Unused now
import HubClient from "@/components/hub/HubClient";
import { Suspense } from "react";
import ProjectCardSkeleton from "@/components/projects/ProjectCardSkeleton";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
// import { fetchHubProjects } from "@/lib/services/hub"; // Unused
// import { hubKeys } from "@/lib/queryKeys"; // Unused
// import { HubFilters } from "@/types/hub"; // Keep type if needed for other things, or remove if unused. It was used in Filters construction.

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ q?: string; view?: string }> }) {
  const params = await searchParams;
  const title = params.q ? `Search: ${params.q}` :
    params.view === 'trending' ? 'Trending Projects' :
      params.view === 'recommendations' ? 'Recommended For You' :
        'Discover Projects';

  return {
    title,
    description: 'Discover and collaborate on the best side-projects and indie apps.',
    openGraph: {
      title,
      description: 'Discover and collaborate on the best side-projects and indie apps.',
    }
  };
}

async function HubPageContent({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string; status?: string; type?: string; sort?: string; tech?: string; page?: string; limit?: string }>;
}) {
  const queryClient = new QueryClient();

  // Start fetching params immediately
  const params = await searchParams;

  // OPTIMIZATION: Removed blocking server-side auth check. 
  // We rely on the client-side useAuth hook to populate the user state.
  // This allows the page shell to render INSTANTLY without waiting for a DB roundtrip.

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <HubClient
        initialUser={null} // Auth is handled client-side for speed
        totalCount={0}
        initialPage={parseInt(params.page || "1")}
        initialLimit={parseInt(params.limit || "24")}
      />
    </HydrationBoundary>
  );
}

export default async function HubPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string; status?: string; type?: string; sort?: string; tech?: string; page?: string; limit?: string }>;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    }>
      <HubPageContent searchParams={searchParams} />
    </Suspense>
  );
}
