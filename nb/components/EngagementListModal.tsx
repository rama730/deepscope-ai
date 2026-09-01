"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";
import Image from "next/image";

interface Props {
  postId: string;
  type: 'likes' | 'reposts' | 'saved' | 'views' | 'quotes';
  onClose: () => void;
}

export default function EngagementListModal({ postId, type, onClose }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      let query;
      if (type === 'likes') {
        query = supabase.from('post_likes').select(`user_id, profiles:user_id ( username, full_name, avatar_url )`).eq('post_id', postId).order('created_at', { ascending: false }).limit(100);
      } else if (type === 'reposts') {
        query = supabase.from('post_reposts').select(`user_id, profiles:user_id ( username, full_name, avatar_url )`).eq('post_id', postId).order('created_at', { ascending: false }).limit(100);
      } else if (type === 'views') {
        query = supabase.from('post_views').select(`user_id, viewed_at, profiles:user_id ( username, full_name, avatar_url )`).eq('post_id', postId).order('viewed_at', { ascending: false }).limit(100);
      } else if (type === 'quotes') {
        query = supabase.from('posts').select(`id, content, created_at, user_id, profiles:user_id ( username, full_name, avatar_url )`).eq('quoted_post_id', postId).order('created_at', { ascending: false }).limit(100);
      } else {
        // Saved (bookmarks) - strictly private, should not be called here usually, but keeping for safety/admin
        query = supabase.from('bookmarks').select(`user_id, profiles:user_id ( username, full_name, avatar_url )`).eq('entity_id', postId).eq('entity_type', 'post').order('created_at', { ascending: false }).limit(100);
      }
      const { data } = await query as any;
      setRows(data || []);
      setLoading(false);
    })();
  }, [postId, type]);

  const title = type === 'likes' ? 'Liked by' : type === 'reposts' ? 'Reposted by' : type === 'views' ? 'Viewed by' : type === 'quotes' ? 'Quotes' : type === 'saved' ? 'Saved by' : 'Bookmarked by';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800">✕</button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-zinc-500">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="p-6 text-center text-zinc-500">No entries</div>
          ) : (
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {rows.map((r, i) => (
                <li key={i} className="p-3 flex items-start gap-3">
                  <Link href={`/profile/${r.user_id}`}>
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white flex items-center justify-center text-xs flex-shrink-0">
                      {r.profiles?.avatar_url ? (
                        <Image
                          src={r.profiles.avatar_url}
                          alt=""
                          width={40}
                          height={40}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        (r.profiles?.full_name || r.profiles?.username || 'U').slice(0, 1).toUpperCase()
                      )}
                    </div>
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Link href={`/profile/${r.user_id}`} className="font-medium hover:underline">{r.profiles?.full_name || r.profiles?.username || 'User'}</Link>
                      <div className="text-xs text-zinc-500">@{r.profiles?.username || 'user'}</div>
                      {type === 'views' && r.viewed_at && (
                        <div className="text-xs text-zinc-400">
                          · {new Date(r.viewed_at).toLocaleString("en-US")}
                        </div>
                      )}
                      {type === 'quotes' && (
                        <div className="text-xs text-zinc-400">
                          · {new Date(r.created_at).toLocaleDateString("en-US")}
                        </div>
                      )}
                    </div>
                    {type === 'quotes' && (
                      <Link href={`/post/${r.id}`} className="block mt-1 text-sm text-zinc-800 dark:text-zinc-200 hover:underline">
                        {r.content}
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}


