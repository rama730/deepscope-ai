import PeoplePage from "../page";

export const dynamic = "force-dynamic";

export default function ConnectionsPage() {
  // Directly render the PeoplePage which will detect the tab via searchParams (or we force it if we refactor PeoplePage to accept props)
  // However, since PeoplePage reads searchParams, we can just render it. But wait, searchParams are read from the URL. 
  // If we utilize the same component but want to force a specific view, passing a prop is better.

  // Note: Next.js Layout/Page structure means this page is rendered at /people/connections. 
  // The searchParams will be empty unless query strings are present.
  // The original PeoplePage acts as a hub. 
  // If we want to reuse PeoplePage logic, we should probably refactor PeoplePage to export a component that accepts a "defaultTab" or "forcedTab".

  // Let's modify PeopleHubClient to accept an initialTab override, 
  // OR we can just redirect in middleware (bad for perf), 
  // OR we renders the Same content.

  // Actually, the best approach as per plan:
  // "Refactor app/(main)/people/connections/page.tsx to remove redirect."
  // "Re-implement to render the PeoplePage content directly with tab='network'"

  // Since PeoplePage is a Server Component, we can import it. But Server Components can't easily be "called" like functions with props if they expect searchParams from the framework.
  // BUT we can just Extract the logic from PeoplePage into a shared "PeoplePageContent" that accepts props.

  return <PeoplePage forcedTab="network" />;
}
