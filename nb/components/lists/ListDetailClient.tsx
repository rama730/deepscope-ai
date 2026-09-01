"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ArrowLeft, UserPlus, X } from "lucide-react";
import Link from "next/link";

import Image from "next/image";
import { profileHref } from "@/lib/routing/identifiers";

interface List {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  user_id: string;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  likes_count: number;
  comments_count: number;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Member {
  id: string;
  user_id: string;
  profiles: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ListDetailClientProps {
  initialList: List;
  initialMembers: Member[];
  initialPosts: Post[];
  currentUser: any;
}

export default function ListDetailClient({
  initialList,
  initialMembers,
  initialPosts,
  currentUser,
}: ListDetailClientProps) {
  const id = initialList.id;

  const supabase = createSupabaseBrowserClient();
  const [list] = useState<List | null>(initialList);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [activeTab, setActiveTab] = useState<"posts" | "members">("posts");
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const currentUserId = currentUser?.id || null;

  // Removed useEffect for initial load since data is passed as props




  async function loadMembers() {
    const { data } = await supabase
      .from("list_members")
      .select(
        `
        id,
        user_id,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        )
      `
      )
      .eq("list_id", id);

    setMembers(data as unknown as Member[] || []);
  }

  async function loadPosts() {
    // Get member IDs
    const { data: memberData } = await supabase
      .from("list_members")
      .select("user_id")
      .eq("list_id", id);

    const memberIds = memberData?.map((m) => m.user_id) || [];

    if (memberIds.length === 0) {
      setPosts([]);
      return;
    }

    // Get posts from members
    const { data: postsData } = await supabase
      .from("posts")
      .select(
        `
        id,
        content,
        created_at,
        user_id,
        likes_count,
        comments_count,
        profiles:user_id (
          username,
          full_name,
          avatar_url
        )
      `
      )
      .in("user_id", memberIds)
      .order("created_at", { ascending: false })
      .limit(50);

    setPosts(postsData as unknown as Post[] || []);
  }

  async function searchUsers() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .or(
        `username.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`
      )
      .limit(10);

    // Filter out existing members
    const memberIds = members.map((m) => m.user_id);
    const filtered = (data || []).filter((u) => !memberIds.includes(u.id));
    setSearchResults(filtered);
  }

  async function addMember(userId: string) {
    const { error } = await supabase.from("list_members").insert({
      list_id: id,
      user_id: userId,
    });

    if (!error) {
      setShowAddMember(false);
      setSearchQuery("");
      setSearchResults([]);
      loadMembers();
      loadPosts();
    }
  }

  async function removeMember(memberId: string) {
    const { error } = await supabase
      .from("list_members")
      .delete()
      .eq("id", memberId);

    if (!error) {
      loadMembers();
      loadPosts();
    }
  }

  useEffect(() => {
    if (searchQuery) {
      const timeout = setTimeout(searchUsers, 300);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [searchQuery]);



  if (!list) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-zinc-500">List not found</p>
      </div>
    );
  }

  const isOwner = list.user_id === currentUserId;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-700 p-4">
        <div className="flex items-center gap-4 mb-3">
          <Link
            href="/lists"
            className="p-2 hover:bg-zinc-100 dark:bg-zinc-900 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{list.name}</h1>
            {list.description && (
              <p className="text-zinc-600 dark:text-zinc-400 mt-1">{list.description}</p>
            )}
          </div>
          {isOwner && (
            <button
              onClick={() => setShowAddMember(true)}
              className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-zinc-200 dark:border-zinc-700">
          <button
            onClick={() => setActiveTab("posts")}
            className={`pb-3 px-1 font-medium transition-colors border-b-2 ${activeTab === "posts"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-50"
              }`}
          >
            Posts
          </button>
          <button
            onClick={() => setActiveTab("members")}
            className={`pb-3 px-1 font-medium transition-colors border-b-2 ${activeTab === "members"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-50"
              }`}
          >
            Members ({members.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === "posts" ? (
          <div className="space-y-4">
            {posts.length === 0 ? (
              <div className="text-center py-12 text-zinc-500">
                <p>No posts yet from list members</p>
              </div>
            ) : (
              posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  className="block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 hover:border-zinc-300 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Image
                      src={post.profiles.avatar_url || "/default-avatar.png"}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {post.profiles.full_name}
                        </span>
                        <span className="text-zinc-500">
                          @{post.profiles.username}
                        </span>
                      </div>
                      <p className="text-zinc-900 dark:text-zinc-50 whitespace-pre-wrap">
                        {post.content}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-zinc-500">
                        <span>{post.likes_count} likes</span>
                        <span>{post.comments_count} comments</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4"
              >
                <Link
                  href={profileHref({ id: member.user_id, username: member.profiles?.username })}
                  className="flex items-center gap-3 flex-1"
                >
                  <Image
                    src={member.profiles.avatar_url || "/default-avatar.png"}
                    alt=""
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      {member.profiles.full_name}
                    </p>
                    <p className="text-sm text-zinc-500">
                      @{member.profiles.username}
                    </p>
                  </div>
                </Link>
                {isOwner && (
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Add Member</h3>
              <button
                onClick={() => setShowAddMember(false)}
                className="p-1 hover:bg-zinc-100 dark:bg-zinc-900 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              />
              <div className="max-h-64 overflow-y-auto space-y-2">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => addMember(user.id)}
                    className="w-full flex items-center gap-3 p-2 hover:bg-zinc-50 dark:bg-zinc-900 rounded-lg transition-colors"
                  >
                    <Image
                      src={user.avatar_url || "/default-avatar.png"}
                      alt=""
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                    <div className="text-left">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {user.full_name}
                      </p>
                      <p className="text-sm text-zinc-500">@{user.username}</p>
                    </div>
                  </button>
                ))}
                {searchQuery && searchResults.length === 0 && (
                  <p className="text-center text-zinc-500 py-4">
                    No users found
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


