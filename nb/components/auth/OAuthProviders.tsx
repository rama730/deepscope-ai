"use client";

import { Chrome, Github, Key } from "lucide-react";

interface OAuthProvidersProps {
    onGoogleLogin: () => void;
    onGithubLogin: () => void;
    onPasskeyLogin?: () => void;
    disabled?: boolean;
    hidePasskey?: boolean;
}

export function OAuthProviders({
    onGoogleLogin,
    onGithubLogin,
    onPasskeyLogin,
    disabled,
    hidePasskey = false,
}: OAuthProvidersProps) {
    return (
        <div className="space-y-4 mt-8">
            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-500">Or continue with</span>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={onGoogleLogin}
                    disabled={disabled}
                    type="button"
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all font-medium disabled:opacity-50"
                >
                    <Chrome size={18} className="text-[#4285F4]" />
                    <span>Google</span>
                </button>
                <button
                    onClick={onGithubLogin}
                    disabled={disabled}
                    type="button"
                    className="flex h-12 items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all font-medium disabled:opacity-50"
                >
                    <Github size={18} />
                    <span>GitHub</span>
                </button>
            </div>

            {!hidePasskey && onPasskeyLogin && (
                <button
                    onClick={onPasskeyLogin}
                    disabled={disabled}
                    type="button"
                    className="w-full h-12 flex items-center justify-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all font-medium disabled:opacity-50"
                >
                    <Key size={18} className="text-primary" />
                    <span>Sign in with Passkey</span>
                </button>
            )}
        </div>
    );
}
