import { z } from "zod";

const envSchema = z.object({
  // Core Config
  NEXT_PUBLIC_SITE_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(), // Added for consistency with layout/sitemap
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  
  // Supabase (Required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url({ message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL" }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, { message: "NEXT_PUBLIC_SUPABASE_ANON_KEY is required" }),
  
  // Supabase Service Role (Server Only - DANGER)
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(), // Optional to avoid client-side build break if missing, but required for Admin

  // Resend (Server Only)
  RESEND_API_KEY: z.string().optional(),

  // Optional Keys
  NEXT_PUBLIC_TENOR_API_KEY: z.string().optional(),
  GOOGLE_TRANSLATE_API_KEY: z.string().optional(),

  // App Environment
  NEXT_PUBLIC_APP_ENV: z.enum(["development", "staging", "production"]).default("development"),
  
  // Monitoring
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
});

// Explicitly construct the object to allow Next.js bundler to inline the values
// This is critical for Client Components where process.env is not a real object.
const runtimeEnv = {
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL, // Added
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  NEXT_PUBLIC_TENOR_API_KEY: process.env.NEXT_PUBLIC_TENOR_API_KEY,
  GOOGLE_TRANSLATE_API_KEY: process.env.GOOGLE_TRANSLATE_API_KEY,
  NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
};

// Validate
const _env = envSchema.safeParse(runtimeEnv);

if (!_env.success) {
  console.error(
    "❌ Invalid environment variables:",
    JSON.stringify(_env.error.format(), null, 2)
  );
  throw new Error("Invalid environment variables");
}

export const env = _env.data;
export const isProduction = env.NEXT_PUBLIC_APP_ENV === "production";
