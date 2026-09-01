import ResetPasswordClient from "@/components/auth/ResetPasswordClient";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const resolved = await searchParams;
  return <ResetPasswordClient initialError={resolved?.error} />;
}


