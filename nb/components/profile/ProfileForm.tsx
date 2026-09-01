"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMessageStore } from "@/stores/useMessageStore";
import { useAuth } from "@/hooks/useAuth";

import Button from "@/components/ui-custom/Button";
import Input from "@/components/ui-custom/Input";
import { Label } from "@/components/ui-custom/Label";
import Textarea from "@/components/ui-custom/Textarea";
import { Alert, AlertDescription } from "@/components/ui-custom/Alert";
import { Loader2 } from "lucide-react";
import { AvatarUpload } from "./AvatarUpload";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations/profile";

interface ProfileFormProps {
    initialData: any;
}

export function ProfileForm({ initialData }: ProfileFormProps) {
    const [isPending, startTransition] = useTransition();
    const [serverError, setServerError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const { user } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors, isDirty },
    } = useForm<UpdateProfileInput>({
        resolver: zodResolver(updateProfileSchema),
        defaultValues: {
            full_name: initialData.full_name || "",
            bio: initialData.bio || "",
            phone: initialData.phone || "",
            location: initialData.location || "",
            date_of_birth: initialData.date_of_birth || "",
            // @ts-ignore - Supabase might return nulls where we want strings/objects
            social_links: {
                twitter: initialData.social_links?.twitter || "",
                linkedin: initialData.social_links?.linkedin || "",
                github: initialData.social_links?.github || "",
                website: initialData.social_links?.website || ""
            }
        },
        mode: "onChange"
    });

    const onSubmit = async (data: UpdateProfileInput) => {
        setServerError(null);
        setSuccess(false);
        startTransition(async () => {
            try {
                const res = await fetch("/api/v1/users/me", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(data),
                });

                if (!res.ok) {
                    const json = await res.json();
                    throw new Error(json.message || "Failed to update profile");
                }

                setSuccess(true);
                // Invalidate cache for this user
                if (initialData.id && user?.id === initialData.id) {
                    useMessageStore.getState().removeCachedSenderProfile(initialData.id);
                }
                setTimeout(() => setSuccess(false), 3000);
            } catch (err: any) {
                setServerError(err.message);
            }
        });
    };

    return (
        <div className="space-y-8">
            <div className="flex items-center gap-6">
                <AvatarUpload
                    currentUrl={initialData.avatar_url}
                    name={initialData.full_name}
                    onUploadSuccess={(_url) => {
                        // Also invalidate cache when avatar updates
                        if (initialData.id && user?.id === initialData.id) {
                            useMessageStore.getState().removeCachedSenderProfile(initialData.id);
                        }
                    }}
                />
                <div>
                    <h3 className="text-lg font-medium">Profile Picture</h3>
                    <p className="text-sm text-muted-foreground">
                        Click to upload a new avatar.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {serverError && (
                    <Alert variant="destructive">
                        <AlertDescription>{serverError}</AlertDescription>
                    </Alert>
                )}
                {success && (
                    <Alert className="bg-green-50 border-green-200 text-green-800">
                        <AlertDescription>Profile updated successfully.</AlertDescription>
                    </Alert>
                )}

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="full_name">Full Name *</Label>
                        <Input id="full_name" {...register("full_name")} disabled={isPending} />
                        {errors.full_name && <p className="text-sm text-red-500">{errors.full_name.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date_of_birth">Date of Birth</Label>
                        <Input id="date_of_birth" type="date" {...register("date_of_birth")} disabled={isPending} />
                        {errors.date_of_birth && <p className="text-sm text-red-500">{errors.date_of_birth.message}</p>}
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                        id="bio"
                        placeholder="Tell us about yourself..."
                        className="resize-none min-h-[100px]"
                        {...register("bio")}
                        disabled={isPending}
                    />
                    {errors.bio && <p className="text-sm text-red-500">{errors.bio.message}</p>}
                    <p className="text-xs text-muted-foreground text-right">{500} characters max</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone</Label>
                        <Input id="phone" type="tel" placeholder="+1234567890" {...register("phone")} disabled={isPending} />
                        {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input id="location" placeholder="City, Country" {...register("location")} disabled={isPending} />
                        {errors.location && <p className="text-sm text-red-500">{errors.location.message}</p>}
                    </div>
                </div>

                <div className="space-y-4">
                    <h4 className="text-sm font-medium">Social Links</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="twitter">Twitter</Label>
                            <Input id="twitter" placeholder="https://twitter.com/..." {...register("social_links.twitter")} disabled={isPending} />
                            {errors.social_links?.twitter && <p className="text-sm text-red-500">{errors.social_links.twitter.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="linkedin">LinkedIn</Label>
                            <Input id="linkedin" placeholder="https://linkedin.com/in/..." {...register("social_links.linkedin")} disabled={isPending} />
                            {errors.social_links?.linkedin && <p className="text-sm text-red-500">{errors.social_links.linkedin.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="github">GitHub</Label>
                            <Input id="github" placeholder="https://github.com/..." {...register("social_links.github")} disabled={isPending} />
                            {errors.social_links?.github && <p className="text-sm text-red-500">{errors.social_links.github.message}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" placeholder="https://..." {...register("social_links.website")} disabled={isPending} />
                            {errors.social_links?.website && <p className="text-sm text-red-500">{errors.social_links.website.message}</p>}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Button type="button" variant="ghost" disabled={isPending || !isDirty} onClick={() => window.location.reload()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isPending || !isDirty}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Save Changes"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
