"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Settings, X, Save } from "lucide-react";

interface FeedPersonalizationProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
}

export default function FeedPersonalization({ isOpen, onClose, onSave }: FeedPersonalizationProps) {
  const supabase = createSupabaseBrowserClient();
  const [interests, setInterests] = useState<string[]>([]);
  const [contentTypes, setContentTypes] = useState<string[]>([]);
  const [availableInterests, setAvailableInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
      loadAvailableInterests();
    }
  }, [isOpen]);

  async function loadPreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const saved = localStorage.getItem(`feedPreferences_${user.id}`);
    if (saved) {
      try {
        const prefs = JSON.parse(saved);
        setInterests(prefs.interests || []);
        setContentTypes(prefs.contentTypes || []);
      } catch (e) {
        console.error('Error loading preferences:', e);
      }
    }
    setLoading(false);
  }

  async function loadAvailableInterests() {
    // Load from trending tags/posts
    const { data: posts } = await supabase
      .from('posts')
      .select('tags, content')
      .not('tags', 'is', null)
      .limit(100);

    if (posts) {
      const tagSet = new Set<string>();
      posts.forEach((post: any) => {
        if (post.tags && Array.isArray(post.tags)) {
          post.tags.forEach((tag: string) => tagSet.add(tag));
        }
        const hashtagRegex = /#([\w]+)/g;
        const matches = post.content?.match(hashtagRegex);
        if (matches) {
          matches.forEach((match: string) => tagSet.add(match.slice(1)));
        }
      });
      setAvailableInterests(Array.from(tagSet).slice(0, 20));
    }
  }

  async function savePreferences() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setSaving(true);
    const prefs = {
      interests,
      contentTypes,
      updatedAt: new Date().toISOString(),
    };
    
    localStorage.setItem(`feedPreferences_${user.id}`, JSON.stringify(prefs));
    
    // Optionally save to database
    // await supabase.from('user_preferences').upsert({ user_id: user.id, feed_preferences: prefs });
    
    setSaving(false);
    onSave?.();
    onClose();
  }

  const toggleInterest = (interest: string) => {
    setInterests(prev => 
      prev.includes(interest) 
        ? prev.filter(i => i !== interest)
        : [...prev, interest]
    );
  };

  const toggleContentType = (type: string) => {
    setContentTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-zinc-900 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-zinc-200 dark:border-zinc-800">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            Feed Personalization
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading preferences...</div>
          ) : (
            <>
              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Content Types
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['standard', 'project_update', 'project_idea', 'collaboration', 'achievement', 'media', 'poll'].map((type) => (
                    <button
                      key={type}
                      onClick={() => toggleContentType(type)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        contentTypes.includes(type)
                          ? 'bg-blue-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      {type.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                  Interests / Topics
                </h4>
                <div className="flex flex-wrap gap-2">
                  {availableInterests.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                        interests.includes(interest)
                          ? 'bg-purple-500 text-white'
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                      }`}
                    >
                      #{interest}
                    </button>
                  ))}
                </div>
                {availableInterests.length === 0 && (
                  <p className="text-sm text-zinc-500">No interests available yet</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePreferences}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Preferences'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
