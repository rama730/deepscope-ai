"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui-custom/Button";
import { Loader2, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui-custom/Alert";

interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'user' | 'admin';
    created_at: string;
}

export default function UsersManagementPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/v1/admin/users");
            const json = await res.json();
            if (json.success) {
                setUsers(json.data.users);
            } else {
                setError(json.message);
            }
        } catch (err) {
            setError("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            const res = await fetch(`/api/v1/admin/users/${userId}/role`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role: newRole }),
            });
            const json = await res.json();
            if (json.success) {
                // Optimistic update
                setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u));
            } else {
                alert(json.message || "Failed to update role");
            }
        } catch (err) {
            alert("Error updating role");
        }
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Are you sure you want to delete this user? This action is irreversible.")) return;

        try {
            const res = await fetch(`/api/v1/admin/users/${userId}`, {
                method: "DELETE",
            });
            const json = await res.json();
            if (json.success) {
                setUsers(users.filter(u => u.id !== userId));
            } else {
                alert(json.message || "Failed to delete user");
            }
        } catch (err) {
            alert("Error deleting user");
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold">User Management</h1>
                <Button onClick={fetchUsers} size="sm" variant="outline">Refresh</Button>
            </div>

            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-muted text-muted-foreground uppercase">
                            <tr>
                                <th className="px-6 py-3">Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Role</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {users.map((user) => (
                                <tr key={user.id} className="bg-background hover:bg-muted/50">
                                    <td className="px-6 py-4 font-medium">{user.full_name || "N/A"}</td>
                                    <td className="px-6 py-4">{user.email}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={user.role}
                                            onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                            className="bg-transparent border rounded p-1"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="text-red-500 hover:text-red-700"
                                            title="Delete User"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
