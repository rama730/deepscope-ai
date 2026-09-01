"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import UsernameInput from "@/components/UsernameInput";
import { sendConnectionRequest } from "@/app/actions/connection";
import PasskeysSection from "@/components/auth/PasskeysSection";
import { useTheme } from "next-themes";
import { useSearchParams } from "next/navigation";
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, MapPin, Upload, LocateFixed } from "lucide-react";
import { buildLocationDisplay } from "@/lib/location";

type OnboardingStep = "profile" | "interests" | "recommendations" | "review" | "settings";

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  date_of_birth?: string | null;
  location: string | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  location_source: string | null;
  onboarding_completed: boolean | null;
  onboarding_step: string | null;
};

type Suggestion = {
  user_id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location: string | null;
  headline: string | null;
  score: number;
  reasons: any;
};

function normalizeList(items: string[]) {
  return Array.from(
    new Set(
      items
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.replace(/\s+/g, " "))
    )
  );
}

function getAgeFromDateString(dateStr: string): number | null {
  const trimmed = (dateStr || "").trim();
  if (!trimmed) return null;

  const parts = trimmed.split("-");
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) return null;

  // Build a local Date from Y-M-D to avoid timezone quirks with `new Date("YYYY-MM-DD")`.
  const dob = new Date(year, month - 1, day);
  if (Number.isNaN(dob.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - year;
  const monthDiff = today.getMonth() - (month - 1);
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < day)) age--;
  return age;
}

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div
      className={[
        "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition-colors",
        active
          ? "bg-indigo-600 text-white border-indigo-600"
          : done
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/40"
            : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800",
      ].join(" ")}
    >
      {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : null}
      <span>{label}</span>
    </div>
  );
}

function TagInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  const add = useCallback(() => {
    const next = normalizeList([...value, draft]);
    setDraft("");
    onChange(next);
  }, [draft, onChange, value]);

  return (
    <div className="space-y-2">
      <div className="flex items-end justify-between">
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{value.length} selected</div>
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-50"
        >
          Add
        </button>
      </div>
      {value.length ? (
        <div className="flex flex-wrap gap-2">
          {value.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onChange(value.filter((v) => v !== item))}
              className="px-3 py-1 rounded-full text-xs border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              title="Remove"
            >
              {item}
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">Add a few to personalize your experience.</div>
      )}
    </div>
  );
}

export default function OnboardingWizard({
  user,
  initialProfile,
}: {
  user: User;
  initialProfile: ProfileRow | null;
}) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const { theme, setTheme } = useTheme();
  const searchParams = useSearchParams();
  const from = searchParams?.get("from") || "";
  const requestedStep = (searchParams?.get("step") || "") as string;
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<OnboardingStep>(() => {
    const s = (initialProfile?.onboarding_step || "profile") as string;
    if (s === "interests" || s === "recommendations" || s === "review" || s === "settings") return s;
    return "profile";
  });

  // If opened from Explorer, optionally jump to a specific step (e.g. interests/people/settings/review).
  useEffect(() => {
    if (!requestedStep) return;
    if (
      requestedStep === "profile" ||
      requestedStep === "interests" ||
      requestedStep === "recommendations" ||
      requestedStep === "review" ||
      requestedStep === "settings"
    ) {
      setStep(requestedStep);
    }
  }, [requestedStep]);

  // Step A (Profile)
  const [username, setUsername] = useState(initialProfile?.username || "");
  const [isUsernameValid, setIsUsernameValid] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialProfile?.avatar_url || user.user_metadata?.avatar_url || null);
  const [bio, setBio] = useState(initialProfile?.bio || "");
  const [dateOfBirth, setDateOfBirth] = useState((initialProfile?.date_of_birth || "").toString());

  const [locationCity, setLocationCity] = useState(initialProfile?.location_city || "");
  const [locationRegion, setLocationRegion] = useState(initialProfile?.location_region || "");
  const [locationCountry, setLocationCountry] = useState(initialProfile?.location_country || "");
  const [locationSource, setLocationSource] = useState<"ip_geo" | "user" | "device_geo" | "">(
    (initialProfile?.location_source as any) || ""
  );

  // Step B (Interests)
  const [skills, setSkills] = useState<string[]>([]);
  const [techniques, setTechniques] = useState<string[]>([]);
  const [tools, setTools] = useState<string[]>([]);

  // Step C (Recommendations)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [connecting, setConnecting] = useState<Record<string, boolean>>({});

  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(false);


  const locationDisplay = useMemo(
    () => buildLocationDisplay(locationCity, locationRegion, locationCountry),
    [locationCity, locationRegion, locationCountry]
  );

  async function persistStep(nextStep: OnboardingStep) {
    await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        onboarding_step: nextStep,
        onboarding_started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
  }

  const guessLocation = useCallback(async () => {
    setError(null);
    setLoadingStep(true);
    try {
      const res = await fetch("/api/v1/users/me/location/guess", { cache: "no-store" });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Unable to guess location");
      const data = json.data || json;
      if (!data?.display) {
        setError(data?.reason || "Unable to detect location. Please enter it manually.");
        return;
      }
      setLocationCity(data.city || "");
      setLocationRegion(data.region || "");
      setLocationCountry(data.country || "");
      setLocationSource("ip_geo");
    } catch (e: any) {
      setError(e?.message || "Unable to guess location");
    } finally {
      setLoadingStep(false);
    }
  }, []);

  const useBrowserLocation = useCallback(async () => {
    setError(null);
    setLoadingStep(true);
    try {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        setError("Geolocation is not supported in this browser.");
        return;
      }

      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60_000,
        });
      });

      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const res = await fetch("/api/v1/geo/reverse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lng }),
      });
      const json = await res.json();
      if (!json?.success) throw new Error(json?.message || "Unable to detect location");
      const data = json.data || json;

      if (!data?.display) {
        setError("Unable to detect location. Please enter it manually.");
        return;
      }

      setLocationCity(data.city || "");
      setLocationRegion(data.region || "");
      setLocationCountry(data.country || "");
      setLocationSource("device_geo");
    } catch (e: any) {
      const code = e?.code;
      if (code === 1) setError("Location permission denied.");
      else if (code === 2) setError("Location unavailable.");
      else if (code === 3) setError("Location request timed out.");
      else setError(e?.message || "Location permission denied or unavailable.");
    } finally {
      setLoadingStep(false);
    }
  }, []);

  useEffect(() => {
    if ((!locationCity && !locationRegion && !locationCountry) && step === "profile") {
      // Best-effort prefill (non-blocking)
      guessLocation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAvatarUpload = useCallback(async (file: File) => {
    setError(null);
    setLoadingStep(true);
    try {
      const fd = new FormData();
      fd.append("avatar", file);
      const res = await fetch("/api/v1/users/me/avatar", { method: "PATCH", body: fd });
      const json = await res.json();
      if (!json?.success) {
        const extra = json?.error?.code ? ` (${json.error.code})` : "";
        throw new Error((json?.message || "Failed to upload avatar") + extra);
      }
      setAvatarUrl(json.data?.avatar_url || json.avatar_url || null);
    } catch (e: any) {
      setError(e?.message || "Failed to upload avatar");
    } finally {
      setLoadingStep(false);
    }
  }, []);

  const canContinueProfile = useMemo(() => {
    const hasAvatar = !!avatarUrl;
    const hasUsername = !!username.trim() && isUsernameValid;
    const age = getAgeFromDateString(dateOfBirth);
    const dobOk = !dateOfBirth.trim() || (typeof age === "number" && age >= 13);
    return hasAvatar && hasUsername && dobOk;
  }, [avatarUrl, dateOfBirth, isUsernameValid, username]);

  const dateOfBirthError = useMemo(() => {
    const trimmed = (dateOfBirth || "").trim();
    if (!trimmed) return null;
    const age = getAgeFromDateString(trimmed);
    if (age === null) return "Please enter a valid date.";
    if (age < 13) return "You must be at least 13 years old.";
    return null;
  }, [dateOfBirth]);


  async function saveProfileAndNext() {
    if (!canContinueProfile) return;
    setError(null);
    setLoadingStep(true);
    try {
      // Backward-compatible: some environments may still have the older DB constraint that only allows
      // location_source IN ('ip_geo','user'). If so, we store 'user' even when the value came from device geo.
      const persistedLocationSource =
        locationSource === "device_geo" ? "user" : ((locationSource || "user") as any);

      const { error: upsertErr } = await supabase.from("profiles").upsert({
        id: user.id,
        username: username.toLowerCase(),
        bio: bio.trim() || null,
        date_of_birth: dateOfBirth.trim() ? dateOfBirth : null,
        location: locationDisplay || null,
        location_city: locationCity.trim() || null,
        location_region: locationRegion.trim() || null,
        location_country: locationCountry.trim() || null,
        location_source: persistedLocationSource,
        onboarding_step: "interests",
        updated_at: new Date().toISOString(),
      });
      if (upsertErr) throw upsertErr;
      setStep("interests");
      await persistStep("interests");
    } catch (e: any) {
      const msg = e?.message || "Failed to save profile";
      if (String(msg).includes("profiles_location_source_check")) {
        setError(
          "Your database constraint for profiles.location_source is outdated. Apply migration 0101_expand_location_source_values.sql (adds 'device_geo') or continue without storing that source."
        );
      } else {
        setError(msg);
      }
    } finally {
      setLoadingStep(false);
    }
  }

  async function saveInterestsAndNext() {
    setError(null);
    setLoadingStep(true);
    try {
      // Replace existing rows for a clean onboarding write
      await supabase.from("skills").delete().eq("user_id", user.id);
      await supabase.from("user_techniques").delete().eq("user_id", user.id);
      await supabase.from("user_tools").delete().eq("user_id", user.id);

      if (skills.length) {
        const { error: insErr } = await supabase.from("skills").insert(
          skills.map((s) => ({
            user_id: user.id,
            skill_name: s,
            proficiency_level: null,
            is_featured: false,
          }))
        );
        if (insErr) throw insErr;
      }

      if (techniques.length) {
        const { error: insErr } = await supabase.from("user_techniques").insert(
          techniques.map((t) => ({
            user_id: user.id,
            technique_name: t,
            proficiency_level: null,
            intent: "skilled",
          }))
        );
        if (insErr) throw insErr;
      }

      if (tools.length) {
        const { error: insErr } = await supabase.from("user_tools").insert(
          tools.map((t) => ({
            user_id: user.id,
            tool_name: t,
            proficiency_level: null,
            intent: "skilled",
          }))
        );
        if (insErr) throw insErr;
      }

      await supabase
        .from("profiles")
        .update({
          onboarding_step: "recommendations",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      setStep("recommendations");
      await persistStep("recommendations");
    } catch (e: any) {
      setError(e?.message || "Failed to save interests");
    } finally {
      setLoadingStep(false);
    }
  }

  const loadSuggestions = useCallback(async () => {
    setError(null);
    setLoadingStep(true);
    try {
      const { data, error: rpcErr } = await supabase.rpc("get_connection_suggestions", { user_uuid: user.id, limit_count: 20 });
      if (rpcErr) throw rpcErr;
      setSuggestions((data || []) as Suggestion[]);
    } catch (e: any) {
      setError(e?.message || "Failed to load recommendations");
    } finally {
      setLoadingStep(false);
    }
  }, [supabase, user.id]);

  useEffect(() => {
    if (step === "recommendations" && suggestions.length === 0) {
      loadSuggestions();
    }
  }, [loadSuggestions, step, suggestions.length]);

  async function handleConnect(targetId: string) {
    setConnecting((p) => ({ ...p, [targetId]: true }));
    setError(null);
    try {
      const res = await sendConnectionRequest(user.id, targetId);
      if ((res as any)?.error) throw new Error((res as any)?.error);
      // Optimistic: remove from list
      setSuggestions((prev) => prev.filter((s) => s.user_id !== targetId));
    } catch (e: any) {
      setError(e?.message || "Failed to send request");
    } finally {
      setConnecting((p) => ({ ...p, [targetId]: false }));
    }
  }

  async function goNextFromRecommendations() {
    setError(null);
    setLoadingStep(true);
    try {
      await supabase
        .from("profiles")
        .update({
          onboarding_step: "review",
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      setStep("review");
      await persistStep("review");
    } catch (e: any) {
      setError(e?.message || "Failed to continue");
    } finally {
      setLoadingStep(false);
    }
  }

  async function completeOnboarding() {
    setError(null);
    setLoadingStep(true);
    try {
      // If user hasn't added a passkey, mark it as skipped so Explorer can prompt later.
      // If user hasn't added a passkey, mark it as skipped so Explorer can prompt later.

      await supabase.from("profiles").update({
        onboarding_completed: true,
        onboarding_step: "completed",
        onboarding_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", user.id);
      window.location.href = "/explorer";
    } catch (e: any) {
      setError(e?.message || "Failed to complete onboarding");
    } finally {
      setLoadingStep(false);
    }
  }

  function goBack() {
    if (step === "interests") setStep("profile");
    else if (step === "recommendations") setStep("interests");
    else if (step === "review") setStep("recommendations");
    else if (step === "settings") setStep("review");
  }

  return (
    <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Welcome</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Set up your profile, interests, and connections in a few steps.</p>
        </div>
        {from === "explorer" ? (
          <button
            type="button"
            onClick={() => (window.location.href = "/explorer")}
            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            title="Back to Explorer"
          >
            Back to Explorer
          </button>
        ) : null}
        <div className="flex flex-wrap gap-2">
          <StepPill label="Profile" active={step === "profile"} done={step !== "profile"} />
          <StepPill label="Interests" active={step === "interests"} done={step === "recommendations" || step === "review" || step === "settings"} />
          <StepPill label="People" active={step === "recommendations"} done={step === "review" || step === "settings"} />
          <StepPill label="Finish" active={step === "review" || step === "settings"} done={false} />
        </div>
      </div>

      {error ? (
        <div className="mb-5 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-300 text-sm border border-red-200 dark:border-red-900/40">
          {error}
        </div>
      ) : null}

      {/* Step A: Profile */}
      {step === "profile" ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="sm:col-span-1">
              <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Avatar (required)</div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                  {avatarUrl ? (
                    <Image src={avatarUrl} alt="" width={64} height={64} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500 text-sm">?</div>
                  )}
                </div>
                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-sm cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <Upload className="w-4 h-4" />
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleAvatarUpload(f);
                    }}
                  />
                </label>
              </div>
              <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">5MB max. Used across the app.</div>
            </div>

            <div className="sm:col-span-2 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Username (required)</label>
                <UsernameInput value={username} onChange={setUsername} onValidation={setIsUsernameValid} excludeUserId={user.id} />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A short line about what you build…"
                  className="w-full min-h-[92px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Date of Birth <span className="font-normal text-zinc-500 dark:text-zinc-400">(optional)</span>
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {dateOfBirthError ? (
                  <div className="mt-1 text-xs text-red-600 dark:text-red-400">{dateOfBirthError}</div>
                ) : (
                  <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">Used for age verification and safety features.</div>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Location</label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={useBrowserLocation}
                      className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-300 hover:underline"
                    >
                      <LocateFixed className="w-3.5 h-3.5" /> Use detected
                    </button>
                    <button
                      type="button"
                      onClick={guessLocation}
                      className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:underline"
                      title="Fallback: approximate location from network headers"
                    >
                      <MapPin className="w-3.5 h-3.5" /> Use IP
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    value={locationCity}
                    onChange={(e) => {
                      setLocationCity(e.target.value);
                      setLocationSource("user");
                    }}
                    placeholder="City"
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    value={locationRegion}
                    onChange={(e) => {
                      setLocationRegion(e.target.value);
                      setLocationSource("user");
                    }}
                    placeholder="Region/State"
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <input
                    value={locationCountry}
                    onChange={(e) => {
                      setLocationCountry(e.target.value);
                      setLocationSource("user");
                    }}
                    placeholder="Country"
                    className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  Used for nearby recommendations. You can change this later.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div />
            <button
              type="button"
              onClick={() => startTransition(saveProfileAndNext)}
              disabled={!canContinueProfile || loadingStep || isPending}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingStep || isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Step B: Interests */}
      {step === "interests" ? (
        <div className="space-y-6">
          <div className="text-sm text-zinc-500 dark:text-zinc-400">
            Interests are optional. Add any skills/techniques/tools to improve recommendations, or continue without them.
          </div>

          <TagInput label="Skills" placeholder="e.g. React, Product Design, Data Viz" value={skills} onChange={setSkills} />
          <TagInput label="Techniques" placeholder="e.g. System design, Wireframing, Testing" value={techniques} onChange={setTechniques} />
          <TagInput label="Tools / Apps" placeholder="e.g. Figma, GitHub, Notion" value={tools} onChange={setTools} />

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => startTransition(saveInterestsAndNext)}
              disabled={loadingStep || isPending}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingStep || isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Step C: Recommendations */}
      {step === "recommendations" ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">People to connect with</h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Based on your skills, tools, and location.</p>
            </div>
            <button
              type="button"
              onClick={loadSuggestions}
              className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              disabled={loadingStep}
            >
              Refresh
            </button>
          </div>

          {loadingStep ? (
            <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading recommendations…
            </div>
          ) : suggestions.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-sm text-zinc-500 dark:text-zinc-400">
              No recommendations yet. Add more interests or try again.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {suggestions.map((p) => {
                const reason = p?.reasons || {};
                const locationLevel = reason.location_match_level;
                const badges: string[] = [];
                if ((reason.shared_skills || 0) > 0) badges.push(`${reason.shared_skills} shared skills`);
                if ((reason.shared_tools || 0) > 0) badges.push(`${reason.shared_tools} shared tools`);
                if ((reason.shared_techniques || 0) > 0) badges.push(`${reason.shared_techniques} shared techniques`);
                if (locationLevel && locationLevel !== "none") badges.push(`Same ${locationLevel}`);

                return (
                  <div key={p.user_id} className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
                        {p.avatar_url ? (
                          <Image src={p.avatar_url} alt="" width={48} height={48} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-500 text-xs">N/A</div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-zinc-900 dark:text-white truncate">
                          {p.full_name || p.username || "User"}
                        </div>
                        {p.location ? (
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{p.location}</div>
                        ) : null}
                      </div>
                    </div>

                    {p.bio ? <div className="mt-3 text-sm text-zinc-600 dark:text-zinc-300 line-clamp-2">{p.bio}</div> : null}

                    {badges.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {badges.slice(0, 3).map((b) => (
                          <span key={b} className="px-2 py-1 rounded-full text-[11px] border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900">
                            {b}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-4 flex items-center justify-between">
                      <div className="text-xs text-zinc-500 dark:text-zinc-400">Score {p.score}</div>
                      <button
                        type="button"
                        onClick={() => handleConnect(p.user_id)}
                        disabled={!!connecting[p.user_id]}
                        className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium disabled:opacity-50"
                      >
                        {connecting[p.user_id] ? <Loader2 className="w-4 h-4 animate-spin" /> : "Connect"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => startTransition(goNextFromRecommendations)}
              disabled={loadingStep || isPending}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Step D: Review */}
      {step === "review" ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Review</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Confirm your setup. You can always edit later.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="text-sm font-semibold mb-2">Profile</div>
              <div className="text-sm text-zinc-600 dark:text-zinc-300">
                <div><span className="text-zinc-500">Username:</span> {username.toLowerCase()}</div>
                <div><span className="text-zinc-500">Bio:</span> {bio.trim() ? bio.trim() : "—"}</div>
                <div><span className="text-zinc-500">Location:</span> {locationDisplay || "—"}</div>
              </div>
              <button type="button" onClick={() => setStep("profile")} className="mt-3 text-xs text-indigo-600 dark:text-indigo-300 hover:underline">
                Edit profile
              </button>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="text-sm font-semibold mb-2">Interests</div>
              <div className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2">
                <div><span className="text-zinc-500">Skills:</span> {skills.length ? skills.join(", ") : "—"}</div>
                <div><span className="text-zinc-500">Techniques:</span> {techniques.length ? techniques.join(", ") : "—"}</div>
                <div><span className="text-zinc-500">Tools:</span> {tools.length ? tools.join(", ") : "—"}</div>
              </div>
              <button type="button" onClick={() => setStep("interests")} className="mt-3 text-xs text-indigo-600 dark:text-indigo-300 hover:underline">
                Edit interests
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  startTransition(async () => {
                    await supabase.from("profiles").update({ onboarding_step: "settings", updated_at: new Date().toISOString() }).eq("id", user.id);
                    setStep("settings");
                    await persistStep("settings");
                  });
                }}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-sm hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                Personalize
              </button>
              <button
                type="button"
                onClick={() => startTransition(completeOnboarding)}
                disabled={loadingStep || isPending}
                className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingStep || isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Finish
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Step E: Settings */}
      {step === "settings" ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">Finish & personalize</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Recommended: add a passkey and pick your theme.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="text-sm font-semibold mb-2">Security (recommended)</div>
              <PasskeysSection />
            </div>

            <div className="p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
              <div className="text-sm font-semibold mb-2">Appearance</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {["light", "dark", "system"].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setTheme(mode)}
                    className={[
                      "p-3 rounded-xl border text-left transition-colors",
                      theme === mode
                        ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-500/10"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700",
                    ].join(" ")}
                  >
                    <div className="font-medium capitalize text-zinc-900 dark:text-white">{mode}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400">
                      {mode === "system" ? "Match device" : mode === "light" ? "Light theme" : "Dark theme"}
                    </div>
                  </button>
                ))}
              </div>
              <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
                You can fine-tune appearance later in Settings.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={goBack}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              type="button"
              onClick={() => startTransition(completeOnboarding)}
              disabled={loadingStep || isPending}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingStep || isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Finish
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}


