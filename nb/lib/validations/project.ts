import { z } from "zod";

// Creator Role Schema
export const creatorRoleSchema = z.object({
    role_type: z.string().min(1, "Role type is required"),
    title: z.string().min(3, "Title must be at least 3 characters").max(50),
    description: z.string().max(500).optional(),
    skills: z.array(z.string()).optional().default([]),
});

// Team Settings Schema
export const teamSettingsSchema = z.object({
    ideal_size: z.string().optional(),
    collaboration_style: z.enum(["async", "sync", "hybrid"]).optional(),
    timezone_preference: z.string().optional(),
});

// Application Settings Schema
export const applicationSettingsSchema = z.object({
    allow_applications: z.boolean().default(true),
    require_portfolio: z.boolean().default(false),
    custom_questions: z.array(z.string()).optional().default([]),
    auto_decline_days: z.number().min(1).max(90).default(30),
});

// Terms Schema
export const termsSchema = z.object({
    ip_agreement: z.enum(["creator", "shared", "open_source", "discuss"]).default("discuss"),
    license: z.string().optional(),
    nda_required: z.enum(["none", "simple", "custom"]).default("none"),
    portfolio_showcase_allowed: z.boolean().default(true),
    additional_terms: z.string().optional(),
});

// External Links Schema
export const externalLinksSchema = z.object({
    discord: z.union([z.string().url(), z.literal(""), z.undefined()]).optional(),
    github: z.union([z.string().url(), z.literal(""), z.undefined()]).optional(),
    website: z.union([z.string().url(), z.literal(""), z.undefined()]).optional(),
    figma: z.union([z.string().url(), z.literal(""), z.undefined()]).optional(),
    slack: z.union([z.string().url(), z.literal(""), z.undefined()]).optional(),
    notion: z.union([z.string().url(), z.literal(""), z.undefined()]).optional(),
});

// Notification Preferences Schema
export const notificationPreferencesSchema = z.object({
    on_application: z.boolean().default(true),
    on_task_complete: z.boolean().default(true),
    on_chat_message: z.boolean().default(true),
    daily_digest: z.boolean().default(false),
});

// Open Role Input Schema
export const openRoleInputSchema = z.object({
    role: z.string().min(1, "Role name is required"),
    count: z.number().min(1).max(10).default(1),
    description: z.string().optional(),
    skills: z.array(z.string()).optional().default([]),
    experience_level: z.enum(["any", "beginner", "intermediate", "advanced", "expert"]).default("any"),
    compensation_type: z.enum(["unpaid", "equity", "paid", "revenue_share"]).default("unpaid"),
    compensation_details: z.string().optional(),
});

// Main Create Project Schema
export const createProjectSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(100),
    description: z.string().min(50, "Description must be at least 50 characters").max(5000),
    short_description: z.string().max(80).optional(),
    project_type: z.string().min(1, "Project type is required"),
    custom_project_type: z.string().optional(),
    status: z.enum(["open", "in_progress", "completed", "paused", "archived"]).default("open"),
    visibility: z.enum(["public", "unlisted", "private"]).default("public"),
    tags: z.array(z.string()).max(8).optional().default([]),
    technologies_used: z.array(z.string()).max(15).optional().default([]),
    lifecycle_stages: z.array(z.string()).optional().default([]),
    current_stage_index: z.number().min(0).default(0),
    problem_statement: z.string().max(500).optional(),
    solution_overview: z.string().max(500).optional(),
    target_audience: z.string().max(150).optional(),
    expected_start_date: z.string().optional(),
    expected_end_date: z.string().optional(),
    goals: z.array(z.string()).max(5).optional().default([]),
    creator_role: creatorRoleSchema.nullable().optional(),
    team_settings: teamSettingsSchema.nullable().optional(),
    application_settings: applicationSettingsSchema.optional(),
    terms: termsSchema.optional(),
    terms_and_conditions: z.string().optional(),
    external_links: externalLinksSchema.optional(),
    notification_preferences: notificationPreferencesSchema.optional(),
    is_draft: z.boolean().default(false),
    metadata: z.record(z.string(), z.any()).optional().default({}),
    slug: z.string().optional(),
    project_id: z.string().optional(),
});

// Update Project Schema (partial)
export const updateProjectSchema = createProjectSchema.partial();

// Query Schema for listing projects
export const projectQuerySchema = z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
    status: z.string().optional(),
    type: z.string().optional(),
    sort: z.enum(["newest", "popular", "alphabetical", "recent_activity"]).default("newest"),
    search: z.string().optional(),
    userId: z.string().optional(),
    scope: z.enum(["me", "all", "team"]).optional().default("me"),
});

// Export types
export type CreatorRole = z.infer<typeof creatorRoleSchema>;
export type TeamSettings = z.infer<typeof teamSettingsSchema>;
export type ApplicationSettings = z.infer<typeof applicationSettingsSchema>;
export type Terms = z.infer<typeof termsSchema>;
export type ExternalLinks = z.infer<typeof externalLinksSchema>;
export type NotificationPreferences = z.infer<typeof notificationPreferencesSchema>;
export type OpenRoleInput = z.infer<typeof openRoleInputSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectQuery = z.infer<typeof projectQuerySchema>;
