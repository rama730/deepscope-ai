import AdminGuard from "@/components/admin/AdminGuard";
import Link from "next/link";
import { Users, LayoutDashboard } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AdminGuard>
            <div className="flex min-h-screen">
                {/* Sidebar */}
                <aside className="w-64 border-r bg-muted/40 hidden md:block">
                    <div className="flex h-14 items-center border-b px-4 font-bold">
                        Admin Panel
                    </div>
                    <nav className="p-4 space-y-2">
                        <Link href="/admin" className="flex items-center gap-2 p-2 rounded hover:bg-accent">
                            <LayoutDashboard className="h-4 w-4" /> Dashboard
                        </Link>
                        <Link href="/admin/users" className="flex items-center gap-2 p-2 rounded hover:bg-accent text-primary">
                            <Users className="h-4 w-4" /> Users
                        </Link>
                    </nav>
                </aside>

                {/* Content */}
                <main className="flex-1 p-6">
                    {children}
                </main>
            </div>
        </AdminGuard>
    );
}
