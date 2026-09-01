"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { cookies } from "next/headers";

const loginSchema = z.object({
  identity: z.string().min(3, "Email or username is required"),
  password: z.string().min(1, "Password is required"), // Allow any length 1+ for login attempts to not leak length requirements
});

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
});

export async function loginAction(formData: FormData) {
  const cookieStore = await cookies();
  const rawData = Object.fromEntries(formData.entries());
  
  // Map 'email' or 'identity' field to identity for backward compatibility
  if (rawData.email && !rawData.identity) {
    rawData.identity = rawData.email;
  }
  
  const validated = loginSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || "Invalid input" };
  }

  const { identity, password } = validated.data;
  const rememberMe = formData.get("rememberMe") === "on";

  const supabase = createSupabaseServerClient();

  let emailToUse = identity;

  // Strict Logic:
  // Starts with "@" -> Username (strip "@" and lookup)
  // Contains "@" -> Email
  // Else -> Treat as Malformed Email 

  const isUsername = identity.startsWith("@");
  
  if (isUsername) {
    const usernameInput = identity.substring(1); 

    try {
      const supabaseAdmin = createSupabaseAdmin();
      
      // 1. Get User ID from Profiles (Bypass RLS)
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .ilike('username', usernameInput)
        .maybeSingle();

      if (!profile || profileError) {
        return { error: "Invalid login credentials" }; 
      }

      // 2. Get Email from Auth (Secure)
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(profile.id);

      if (userError || !userData.user || !userData.user.email) {
        return { error: "Invalid login credentials" };
      }

      emailToUse = userData.user.email;
      
    } catch (err) {
      console.error("Username login failed:", err);
      return { error: "Invalid login credentials" };
    }
  }
  // Else: Proceed as email (even if it's just "user" without @, Supabase will reject it as invalid email)

  // Perform login with the resolved email or original email
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailToUse,
    password,
  });

  if (error) {
    return { error: "Invalid login credentials" }; // Generic error message for security
  }

  // Handle MFA Check logic
  const { data: mfaData } = await supabase.auth.mfa.listFactors();
  const hasMFA = mfaData?.totp && mfaData.totp.length > 0;

  if (hasMFA) {
    return { requiresMFA: true };
  }

  // Cookie management for "Remember me"
  if (rememberMe) {
    cookieStore.set("remembered_email", emailToUse, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  } else {
    cookieStore.delete("remembered_email");
  }

  revalidatePath("/", "layout");
  return { success: true, user: data.user };
}

export async function signupAction(formData: FormData) {
  const rawData = Object.fromEntries(formData.entries());
  const validated = signupSchema.safeParse(rawData);

  if (!validated.success) {
    return { error: validated.error.issues[0]?.message || "Invalid input" };
  }

  const { email, password, fullName, username } = validated.data;

  const supabase = createSupabaseServerClient();

  const { data: { user }, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || null,
        username: username.toLowerCase(),
      },
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (user) {
    await supabase.from("profiles").upsert({
      id: user.id,
      username: username.toLowerCase(),
      full_name: fullName || null,
      updated_at: new Date().toISOString(),
    });
  }

  return { success: true, message: "Verification email sent. Please check your inbox." };
}

export async function resendVerificationAction(email: string) {
  const validated = z.string().email("Invalid email address").safeParse(email);
  if (!validated.success) return { error: validated.error.issues[0]?.message || "Invalid email" };

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: validated.data,
  });

  if (error) return { error: error.message };
  return { success: true, message: "Verification email resent." };
}

export async function verifyMfaAction(code: string) {
  if (!code || code.length < 6) return { error: "Valid MFA code is required" };

  const supabase = createSupabaseServerClient();
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  
  if (factorsError) return { error: factorsError.message };
  
  const totpFactor = factors.totp[0];
  if (!totpFactor) return { error: "No TOTP factor found" };

  const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
  if (challenge.error) return { error: challenge.error.message };

  const verify = await supabase.auth.mfa.verify({
    factorId: totpFactor.id,
    challengeId: challenge.data.id,
    code,
  });

  if (verify.error) return { error: verify.error.message };

  revalidatePath("/", "layout");
  return { success: true };
}
