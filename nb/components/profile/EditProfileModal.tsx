"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import UsernameInput from "@/components/UsernameInput";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/profile";
import { X, Plus, Loader2, MapPin, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { buildLocationDisplay } from "@/lib/location";

type ProfileAvailability = "available" | "busy" | "away";

type ProfileSocialLinks = {
  twitter?: string | null;
  linkedin?: string | null;
  github?: string | null;
  website?: string | null;
} | null;

type Profile = {
  id?: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  headline?: string | null;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  location_city?: string | null;
  location_region?: string | null;
  location_country?: string | null;
  location_source?: string | null;
  website?: string | null;
  availability_status?: ProfileAvailability | null;
  date_of_birth?: string | null;
  social_links?: ProfileSocialLinks;
  open_to?: string[] | null;
};

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: Profile | null;
  onSave: () => void;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
      <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800">
        <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>
        {description ? <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</div> : null}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{msg}</p>;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const maybe = err as { message?: unknown };
    if (typeof maybe.message === "string") return maybe.message;
  }
  return "Update failed";
}

function splitLocationDisplay(display: string | null | undefined): {
  city: string;
  region: string;
  country: string;
} {
  const raw = (display || "").trim();
  if (!raw) return { city: "", region: "", country: "" };
  const parts = raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 1) return { city: parts[0] || "", region: "", country: "" };
  if (parts.length === 2) return { city: parts[0] || "", region: "", country: parts[1] || "" };
  return { city: parts[0] || "", region: parts[1] || "", country: parts.slice(2).join(", ") || "" };
}

export default function EditProfileModal({ isOpen, onClose, profile, onSave }: EditProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [username, setUsername] = useState(profile?.username || "");
  const [usernameValid, setUsernameValid] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(profile?.avatar_url || null);

  const [openTo, setOpenTo] = useState<string[]>(profile?.open_to || []);
  const [openToDraft, setOpenToDraft] = useState("");

  const initialSplit = useMemo(() => splitLocationDisplay(profile?.location), [profile?.location]);
  const [locationCity, setLocationCity] = useState<string>(profile?.location_city || initialSplit.city || "");
  const [locationRegion, setLocationRegion] = useState<string>(profile?.location_region || initialSplit.region || "");
  const [locationCountry, setLocationCountry] = useState<string>(profile?.location_country || initialSplit.country || "");
  const [locationSource, setLocationSource] = useState<string>((profile?.location_source as string) || "");
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const locationDisplay = useMemo(
    () => buildLocationDisplay(locationCity, locationRegion, locationCountry),
    [locationCity, locationRegion, locationCountry]
  );

  const openToSuggestions = useMemo(
    () => ["Cofounder", "Freelance", "Full-time", "Part-time", "Internship", "Mentorship", "Open-source", "Hackathons"],
    []
  );

  const formId = "edit-profile-form";
  const initialRef = useRef<{
    username: string;
    openTo: string[];
    avatarUrl: string | null;
    locationCity: string;
    locationRegion: string;
    locationCountry: string;
    locationSource: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      headline: profile?.headline || "",
      bio: profile?.bio || "",
      phone: profile?.phone || "",
      location: profile?.location || "",
      website: profile?.website || "",
      availability_status: profile?.availability_status || "available",
      date_of_birth: profile?.date_of_birth || "",
      social_links: {
        twitter: profile?.social_links?.twitter || "",
        linkedin: profile?.social_links?.linkedin || "",
        github: profile?.social_links?.github || "",
        website: profile?.social_links?.website || ""
      }
    }
  });

  useEffect(() => {
    if (profile) {
      const split = splitLocationDisplay(profile?.location);
      reset({
        full_name: profile?.full_name || "",
        headline: profile?.headline || "",
        bio: profile?.bio || "",
        phone: profile?.phone || "",
        location: profile?.location || "",
        website: profile?.website || "",
        availability_status: profile?.availability_status || "available",
        date_of_birth: profile?.date_of_birth || "",
        social_links: {
          twitter: profile?.social_links?.twitter || "",
          linkedin: profile?.social_links?.linkedin || "",
          github: profile?.social_links?.github || "",
          website: profile?.social_links?.website || ""
        }
      });
      setUsername(profile?.username || "");
      setOpenTo(profile?.open_to || []);
      setAvatarUrl(profile?.avatar_url || null);
      setLocationCity(profile?.location_city || split.city || "");
      setLocationRegion(profile?.location_region || split.region || "");
      setLocationCountry(profile?.location_country || split.country || "");
      setLocationSource((profile?.location_source as string) || "");
      setLocationError(null);
      setServerError(null);

      initialRef.current = {
        username: profile?.username || "",
        openTo: profile?.open_to || [],
        avatarUrl: profile?.avatar_url || null,
        locationCity: profile?.location_city || split.city || "",
        locationRegion: profile?.location_region || split.region || "",
        locationCountry: profile?.location_country || split.country || "",
        locationSource: (profile?.location_source as string) || "",
      };
    }
  }, [profile, reset]);

  const hasUnsavedChanges = useMemo(() => {
    const initial = initialRef.current;
    if (!initial) return false;

    const openToEqual = JSON.stringify(openTo) === JSON.stringify(initial.openTo);

    return (
      isDirty ||
      username !== initial.username ||
      !openToEqual ||
      avatarUrl !== initial.avatarUrl ||
      locationCity !== initial.locationCity ||
      locationRegion !== initial.locationRegion ||
      locationCountry !== initial.locationCountry ||
      locationSource !== initial.locationSource
    );
  }, [
    avatarUrl,
    isDirty,
    locationCity,
    locationCountry,
    locationRegion,
    locationSource,
    openTo,
    username,
  ]);

  const [unsavedPromptOpen, setUnsavedPromptOpen] = useState(false);

  const requestClose = useCallback(() => {
    if (loading) return;
    if (hasUnsavedChanges) {
      setUnsavedPromptOpen(true);
      return;
    }
    onClose();
  }, [hasUnsavedChanges, loading, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        requestClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, requestClose]);

  const guessLocation = useCallback(async () => {
    setLocationError(null);
    setLocationLoading(true);
    try {
      const res = await fetch("/api/v1/users/me/location/guess", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Failed to guess location (${res.status})`);
      }
      // Safely parse JSON
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Invalid server response");
      }

      if (!json?.success) throw new Error(json?.message || "Unable to guess location");
      const data = json.data || json;
      if (!data?.display) {
        setLocationError(data?.reason || "Unable to detect location. Please enter it manually.");
        return;
      }
      setLocationCity(data.city || "");
      setLocationRegion(data.region || "");
      setLocationCountry(data.country || "");
      setLocationSource("ip_geo");
    } catch (e: any) {
      setLocationError(e?.message || "Unable to guess location");
    } finally {
      setLocationLoading(false);
    }
  }, []);

  const useBrowserLocation = useCallback(async () => {
    setLocationError(null);
    setLocationLoading(true);
    try {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        setLocationError("Geolocation is not supported in this browser.");
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

      if (!res.ok) {
        throw new Error(`Location lookup failed (${res.status})`);
      }

      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("Invalid server response");
      }

      if (!json?.success) throw new Error(json?.message || "Unable to detect location");
      const data = json.data || json;

      if (!data?.display) {
        setLocationError("Unable to detect location. Please enter it manually.");
        return;
      }

      setLocationCity(data.city || "");
      setLocationRegion(data.region || "");
      setLocationCountry(data.country || "");
      setLocationSource("device_geo");
    } catch (e: any) {
      const code = e?.code;
      if (code === 1) setLocationError("Location permission denied.");
      else if (code === 2) setLocationError("Location unavailable.");
      else if (code === 3) setLocationError("Location request timed out.");
      else setLocationError(e?.message || "Location permission denied or unavailable.");
    } finally {
      setLocationLoading(false);
    }
  }, []);

  async function onFormSubmit(data: UpdateProfileInput) {
    setLoading(true);
    try {
      if (!usernameValid) throw new Error("Please choose a valid username");

      // Consolidated API Update (Profile v2 fields)
      const payload = {
        ...data,
        username: username?.trim() ? username.trim() : undefined,
        open_to: openTo,
        // Keep location consistent with onboarding: persist normalized fields + recompute display.
        location: locationDisplay,
        location_city: locationCity,
        location_region: locationRegion,
        location_country: locationCountry,
        location_source: locationDisplay ? (locationSource || "user") : ""
      };

      const res = await fetch("/api/v1/users/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to update profile");
      }

      onSave();
      onClose();

    } catch (error: unknown) {
      setServerError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  function normalizeChip(s: string) {
    return s.trim().replace(/\s+/g, " ");
  }

  function addOpenTo(value: string) {
    const v = normalizeChip(value);
    if (!v) return;
    setOpenTo((prev) => (prev.includes(v) ? prev : [...prev, v]));
    setOpenToDraft("");
  }

  function removeOpenTo(item: string) {
    setOpenTo((prev) => prev.filter((i) => i !== item));
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div className="bg-white dark:bg-zinc-950 rounded-3xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
        {/* Header */}
        <div className="px-7 py-6 border-b border-zinc-200 dark:border-zinc-800 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Edit profile</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Keep it crisp—tell people what you build and how to collaborate.
            </p>
          </div>
          <button onClick={requestClose} className="p-2 rounded-xl hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-900">
            <X className="w-5 h-5 text-zinc-500" />
          </button>
        </div>

        <form
          id={formId}
          onSubmit={handleSubmit(onFormSubmit)}
          className="flex-1 min-h-0 overflow-y-auto p-6 space-y-6 bg-white dark:bg-zinc-950"
        >
          {serverError ? (
            <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-white dark:bg-zinc-950 p-4">
              <div className="text-sm font-semibold text-red-700 dark:text-red-400">Couldn’t save</div>
              <div className="mt-1 text-sm text-red-600 dark:text-red-300">{serverError}</div>
            </div>
          ) : null}

          <Section title="Profile picture" description="Shown across the product (Explorer, posts, messages).">
            <div className="flex items-center gap-6">
              <AvatarUpload
                currentUrl={avatarUrl}
                name={(profile?.full_name || profile?.username || "User") as string}
                onUploadSuccess={(url) => {
                  setAvatarUrl(url);
                  if (initialRef.current) initialRef.current.avatarUrl = url;
                  // Refresh the profile data behind the modal so the new avatar shows immediately.
                  onSave();
                }}
              />
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Change photo</div>
                <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Upload a square image. We’ll optimize it automatically.
                </div>
              </div>
            </div>
          </Section>

          <Section title="Basics" description="These appear at the top of your profile.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Full name</label>
                <input
                  {...register("full_name")}
                  className="mt-2 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
                <FieldError msg={errors.full_name?.message} />
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Username</label>
                <div className="mt-2">
                  <UsernameInput value={username} onChange={setUsername} onValidation={setUsernameValid} excludeUserId={profile?.id} />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Headline</label>
                <input
                  {...register("headline")}
                  placeholder="e.g. Full-stack builder • Next.js • Supabase"
                  className="mt-2 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
                <FieldError msg={errors.headline?.message?.toString()} />
              </div>
            </div>
          </Section>

          <Section title="About" description="A short summary and your collaboration intent.">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Bio</label>
                <textarea
                  {...register("bio")}
                  rows={5}
                  placeholder="What you build, what you’ve built, what you want next…"
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
                <FieldError msg={errors.bio?.message} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Location</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={useBrowserLocation}
                        disabled={locationLoading}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-300 hover:underline disabled:opacity-60"
                      >
                        <LocateFixed className="w-3.5 h-3.5" /> Use detected
                      </button>
                      <button
                        type="button"
                        onClick={guessLocation}
                        disabled={locationLoading}
                        className="inline-flex items-center gap-1 text-xs text-zinc-600 dark:text-zinc-400 hover:underline disabled:opacity-60"
                        title="Fallback: approximate location from network headers"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Use IP
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      value={locationCity}
                      onChange={(e) => {
                        setLocationCity(e.target.value);
                        setLocationSource("user");
                      }}
                      placeholder="City"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                    />
                    <input
                      value={locationRegion}
                      onChange={(e) => {
                        setLocationRegion(e.target.value);
                        setLocationSource("user");
                      }}
                      placeholder="Region/State"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                    />
                    <input
                      value={locationCountry}
                      onChange={(e) => {
                        setLocationCountry(e.target.value);
                        setLocationSource("user");
                      }}
                      placeholder="Country"
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                    />
                  </div>
                  {locationError ? (
                    <div className="mt-1 text-xs text-red-600 dark:text-red-400">{locationError}</div>
                  ) : (
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      Used for nearby recommendations. You can change this later.
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Availability</label>
                  <select
                    {...register("availability_status")}
                    className="mt-2 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                  >
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="away">Away</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Open to</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {openToSuggestions.map((s) => {
                    const active = openTo.includes(s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => (active ? removeOpenTo(s) : addOpenTo(s))}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                          active
                            ? "bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 dark:border-white"
                            : "bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                        )}
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 flex gap-2">
                  <input
                    value={openToDraft}
                    onChange={(e) => setOpenToDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addOpenTo(openToDraft);
                      }
                    }}
                    placeholder="Add a custom option…"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                  />
                  <button
                    type="button"
                    onClick={() => addOpenTo(openToDraft)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>

                {openTo.length ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {openTo.map((x) => (
                      <span
                        key={x}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                      >
                        {x}
                        <button
                          type="button"
                          onClick={() => removeOpenTo(x)}
                          className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-50 dark:hover:text-white"
                          aria-label={`Remove ${x}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          </Section>

          <Section title="Links" description="These appear in the right rail of your profile.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Website</label>
                <input
                  {...register("website")}
                  placeholder="https://your-site.com"
                  className="mt-2 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
                <FieldError msg={errors.website?.message?.toString()} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">GitHub</label>
                <input
                  {...register("social_links.github")}
                  placeholder="https://github.com/you"
                  className="mt-2 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">LinkedIn</label>
                <input
                  {...register("social_links.linkedin")}
                  placeholder="https://linkedin.com/in/you"
                  className="mt-2 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Twitter / X</label>
                <input
                  {...register("social_links.twitter")}
                  placeholder="https://x.com/you"
                  className="mt-2 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Extra link</label>
                <input
                  {...register("social_links.website")}
                  placeholder="https://link.example"
                  className="mt-2 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
              </div>
            </div>
          </Section>

          <Section title="Private" description="Not shown publicly (optional).">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Phone</label>
                <input
                  {...register("phone")}
                  placeholder="+1234567890"
                  className="mt-2 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
                <FieldError msg={errors.phone?.message} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Date of birth</label>
                <input
                  type="date"
                  {...register("date_of_birth")}
                  className="mt-2 w-full px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950"
                />
                <FieldError msg={errors.date_of_birth?.message?.toString()} />
              </div>
            </div>
          </Section>
        </form>

        {/* Footer */}
        <div className="px-7 py-5 border-t border-zinc-200 dark:border-zinc-800 flex items-center justify-end gap-3 bg-white dark:bg-zinc-950">
          <button
            type="button"
            onClick={requestClose}
            className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            form={formId}
            disabled={loading || !usernameValid}
            className="px-6 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save changes
          </button>
        </div>
      </div>

      {unsavedPromptOpen ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setUnsavedPromptOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl p-5">
            <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Unsaved changes</div>
            <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              You have unsaved changes. Do you want to save them before leaving?
            </div>
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setUnsavedPromptOpen(false)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-900 font-semibold"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnsavedPromptOpen(false);
                  onClose();
                }}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-900 font-semibold"
              >
                Leave without saving
              </button>
              <button
                type="button"
                onClick={() => {
                  setUnsavedPromptOpen(false);
                  void handleSubmit(onFormSubmit)();
                }}
                disabled={loading || !usernameValid}
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
