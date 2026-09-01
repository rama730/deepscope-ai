import LoginClient from "@/components/auth/LoginClient";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const supabase = createSupabaseServerClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (session) {
    redirect("/explorer");
  }

  const cookieStore = await cookies();
  const initialEmail = cookieStore.get("remembered_email")?.value || "";

  return <LoginClient initialEmail={initialEmail} />;
}
