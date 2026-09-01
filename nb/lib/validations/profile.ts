import { z } from "zod";

/**
 * Profile Validation Schemas
 */

export const socialLinksSchema = z.object({
    twitter: z.string().url("Invalid URL").optional().or(z.literal('')),
    linkedin: z.string().url("Invalid URL").optional().or(z.literal('')),
    github: z.string().url("Invalid URL").optional().or(z.literal('')),
    website: z.string().url("Invalid URL").optional().or(z.literal(''))
});

export const updateProfileSchema = z.object({
    full_name: z.string().min(2, "Name must be at least 2 characters"),
    headline: z.string().max(120, "Headline must be 120 characters or less").optional().or(z.literal('')),
    website: z.string().url("Invalid URL").optional().or(z.literal('')),
    availability_status: z.enum(["available", "busy", "away"]).optional().or(z.literal('')),
    bio: z.string().max(500, "Bio must be less than 500 characters").optional().or(z.literal('')),
    phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional().or(z.literal('')),
    location: z.string().optional().or(z.literal('')),
    location_city: z.string().optional().or(z.literal('')),
    location_region: z.string().optional().or(z.literal('')),
    location_country: z.string().optional().or(z.literal('')),
    location_source: z.enum(["ip_geo", "user", "device_geo"]).optional().or(z.literal('')),
    date_of_birth: z.string().refine((val) => {
        if (!val) return true;
        const date = new Date(val);
        if (Number.isNaN(date.getTime())) return false;
        const today = new Date();
        let age = today.getFullYear() - date.getFullYear();
        const m = today.getMonth() - date.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
            age--;
        }
        return age >= 13;
    }, "You must be at least 13 years old").optional().or(z.literal('')),
    social_links: socialLinksSchema.optional(),
    avatar_url: z.string().optional(),
    username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_-]+$/, "Alphanumeric, underscores and hyphens only").optional(),
    open_to: z.array(z.string()).optional()
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// PATCH schema: allow partial updates (e.g., inline bio edit on profile page)
export const updateProfilePatchSchema = updateProfileSchema.partial();
export type UpdateProfilePatchInput = z.infer<typeof updateProfilePatchSchema>;
