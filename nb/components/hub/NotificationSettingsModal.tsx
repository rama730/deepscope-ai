"use client";

import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

interface NotificationSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface NotificationSettings {
    email_notifications: boolean;
    push_notifications: boolean;
    notify_on_comments: boolean;
    notify_on_mentions: boolean;
    notify_on_likes: boolean;
    notify_on_reposts: boolean;
    notify_on_follows: boolean;
}

export default function NotificationSettingsModal({ isOpen, onClose }: NotificationSettingsModalProps) {
    const supabase = createSupabaseBrowserClient();
    const [settings, setSettings] = useState<NotificationSettings>({
        email_notifications: true,
        push_notifications: true,
        notify_on_comments: true,
        notify_on_mentions: true,
        notify_on_likes: false,
        notify_on_reposts: false,
        notify_on_follows: true,
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    async function loadSettings() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notification_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (data) {
                setSettings(data);
            } else if (error) {
                // Only log real errors, not "no rows found" (PGRST116)
                // Also skip empty error objects
                if (error.code && error.code !== 'PGRST116') {
                    console.error("Error loading settings:", {
                        code: error.code,
                        message: error.message,
                        details: error.details,
                        hint: error.hint
                    });
                } else if (error.message && error.code !== 'PGRST116') {
                    console.error("Error loading settings:", {
                        message: error.message,
                        error
                    });
                }
                // If error is empty or just PGRST116, silently continue (no settings found is expected for new users)
            }
        } catch (err) {
            console.error("Error loading settings:", err instanceof Error ? {
                message: err.message,
                stack: err.stack
            } : err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSave() {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('notification_settings')
                .upsert({
                    user_id: user.id,
                    ...settings,
                    updated_at: new Date().toISOString()
                });

            if (!error) {
                onClose();
            } else {
                console.error("Error saving settings:", {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
            }
        } catch (err) {
            console.error("Error saving settings:", err instanceof Error ? {
                message: err.message,
                stack: err.stack
            } : err);
        } finally {
            setSaving(false);
        }
    }

    const toggleSetting = (key: keyof NotificationSettings) => {
        setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={onClose}
        >
            <div
                className="notification-settings-modal w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Notification Settings</h2>
                    <button onClick={onClose} className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-300 dark:hover:text-zinc-300">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : (
                        <>
                            {/* Channels */}
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Channels</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="font-medium">Email Notifications</span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={settings.email_notifications} onChange={() => toggleSetting('email_notifications')} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                                        </div>
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="font-medium">Push Notifications</span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={settings.push_notifications} onChange={() => toggleSetting('push_notifications')} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Activity */}
                            <div>
                                <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider mb-3">Activity</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="font-medium">Mentions & Replies</span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={settings.notify_on_mentions} onChange={() => toggleSetting('notify_on_mentions')} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                                        </div>
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="font-medium">New Comments</span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={settings.notify_on_comments} onChange={() => toggleSetting('notify_on_comments')} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                                        </div>
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="font-medium">Likes</span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={settings.notify_on_likes} onChange={() => toggleSetting('notify_on_likes')} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                                        </div>
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="font-medium">Reposts</span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={settings.notify_on_reposts} onChange={() => toggleSetting('notify_on_reposts')} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                                        </div>
                                    </label>
                                    <label className="flex items-center justify-between cursor-pointer">
                                        <span className="font-medium">New Followers</span>
                                        <div className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" checked={settings.notify_on_follows} onChange={() => toggleSetting('notify_on_follows')} className="sr-only peer" />
                                            <div className="w-11 h-6 bg-zinc-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-zinc-600 peer-checked:bg-blue-600"></div>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-zinc-200 dark:border-zinc-800 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || loading}
                        className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
