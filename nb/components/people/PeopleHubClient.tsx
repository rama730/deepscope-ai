"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Inbox, Sparkles, Share2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

import PeopleClient from "@/components/people/PeopleClient";
import ConnectionsClient from "@/components/people/ConnectionsClient";
import PeopleInboxTab from "@/components/people/PeopleInboxTab";
import ApplicationsTab from "@/components/people/ApplicationsTab";
import { usePeopleNotifications } from "@/hooks/usePeopleNotifications";
import { InboxData } from "@/types/people";

type TabKey = "inbox" | "discover" | "network" | "applications";

interface PeopleHubClientProps {
  initialUser: any; // Ideally this should be strict User type from Supabase or custom
  activeTabOverride?: string;
  profilesPromise?: Promise<any>;
  facetsPromise?: Promise<any>;
  connectionsPromise?: Promise<any>;
  inboxPromise?: Promise<InboxData>;
}

const EMPTY_ARRAY: any[] = [];

export default function PeopleHubClient({
  initialUser,
  activeTabOverride,
  profilesPromise,
  facetsPromise,
  connectionsPromise,
  inboxPromise,
}: PeopleHubClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const isAuthed = !!initialUser?.id;

  const tabParam = (searchParams?.get("tab") || "").toLowerCase();

  // Priority: activeTabOverride > active param > default
  const defaultTab: TabKey = "discover";

  // Determine initial tab
  const getInitialTab = (): TabKey => {
    if (activeTabOverride) return activeTabOverride as TabKey;
    if (tabParam === "inbox" || tabParam === "discover" || tabParam === "network" || tabParam === "applications") {
      return tabParam as TabKey;
    }
    return defaultTab;
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab);

  // Sync state if props change
  useEffect(() => {
    const validTabs: TabKey[] = ["inbox", "discover", "network", "applications"];
    const paramTab = (tabParam as TabKey);

    if (validTabs.includes(paramTab)) {
      setActiveTab(paramTab);
    } else if (activeTabOverride) {
      setActiveTab(activeTabOverride as TabKey);
    } else {
      setActiveTab(defaultTab);
    }
  }, [tabParam, defaultTab, activeTabOverride]);

  const { totalPending } = usePeopleNotifications();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > 0;
      setIsScrolled(prev => {
        if (prev !== scrolled) return scrolled;
        return prev;
      });
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const tabs = useMemo(
    () =>
      [
        { key: "discover" as const, label: "Discover", icon: Sparkles, requiresAuth: false },
        { key: "network" as const, label: "Network", icon: Share2, requiresAuth: true },
        {
          key: "inbox" as const,
          label: totalPending > 0 ? `Inbox (${totalPending})` : "Inbox",
          icon: Inbox,
          requiresAuth: true
        },
        { key: "applications" as const, label: "Applications", icon: FileText, requiresAuth: true },
      ].filter((t) => (t.requiresAuth ? isAuthed : true)),
    [isAuthed, totalPending]
  );

  function navigateTab(next: TabKey) {
    if (next === activeTab) return;
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("tab", next);
    router.push(`/people?${params.toString()}`);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header Removed as requested */}
      <div className={cn(
        "sticky top-[var(--header-height,64px)] z-30 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800 transition-all duration-200",
        isScrolled && "shadow-sm"
      )}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-3">
            {tabs.map((t) => {
              const Icon = t.icon;
              const selected = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => navigateTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    selected
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800"
                  )}
                  aria-current={selected ? "page" : undefined}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "inbox" ? (
          <PeopleInboxTab initialUser={initialUser} inboxPromise={inboxPromise} />
        ) : null}

        {activeTab === "discover" ? (
          <PeopleClient
            embedded
            initialProfiles={EMPTY_ARRAY}
            initialUser={initialUser}
            initialFacetProjectTags={EMPTY_ARRAY}
            initialFacetSkills={EMPTY_ARRAY}
            initialFacetLocations={EMPTY_ARRAY}
            profilesPromise={profilesPromise}
            connectionsPromise={connectionsPromise}
            facetsPromise={facetsPromise}
          />
        ) : null}

        {activeTab === "network" ? (
          <ConnectionsClient
            embedded
            initialUser={initialUser}
          />
        ) : null}

        {activeTab === "applications" ? (
          <ApplicationsTab initialUser={initialUser} />
        ) : null}
      </div>
    </div>
  );
}


