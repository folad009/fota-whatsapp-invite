"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type UserRole = "admin" | "organizer";

type UserRow = {
  _id: Id<"users">;
  _creationTime: number;
  name?: string;
  email?: string;
  role: UserRole;
};

const emptyForm = {
  name: "",
  email: "",
  password: "",
  role: "organizer" as UserRole,
};

export function UserAdminPanel() {
  const users = useQuery(api.users.list);
  const createUser = useAction(api.users.create);
  const updateUser = useMutation(api.users.update);
  const removeUser = useMutation(api.users.remove);
  const resetPassword = useAction(api.users.resetPassword);

  const [createForm, setCreateForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<Id<"users"> | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    role: "organizer" as UserRole,
    password: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const showMessage = (text: string, isError = false) => {
    if (isError) {
      setError(text);
      setMessage("");
    } else {
      setMessage(text);
      setError("");
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("create");
    try {
      await createUser(createForm);
      setCreateForm(emptyForm);
      showMessage("User created");
    } catch (err) {
      showMessage(err instanceof Error ? err.message : "Failed to create user", true);
    } finally {
      setLoading(null);
    }
  };

  const startEdit = (user: UserRow) => {
    setEditingId(user._id);
    setEditForm({
      name: user.name ?? "",
      email: user.email ?? "",
      role: user.role,
      password: "",
    });
    setMessage("");
    setError("");
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    setLoading("update");
    try {
      await updateUser({
        userId: editingId,
        name: editForm.name,
        email: editForm.email,
        role: editForm.role,
      });
      if (editForm.password) {
        await resetPassword({ userId: editingId, password: editForm.password });
      }
      setEditingId(null);
      showMessage("User updated");
    } catch (err) {
      showMessage(err instanceof Error ? err.message : "Failed to update user", true);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (userId: Id<"users">, email?: string) => {
    if (!confirm(`Delete user ${email ?? userId}?`)) return;

    setLoading(`delete-${userId}`);
    try {
      await removeUser({ userId });
      if (editingId === userId) {
        setEditingId(null);
      }
      showMessage("User deleted");
    } catch (err) {
      showMessage(err instanceof Error ? err.message : "Failed to delete user", true);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">
          Create and manage organizer accounts
        </p>
      </div>

      {message && <p className="text-sm text-primary">{message}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Create user</CardTitle>
          <CardDescription>Add a new organizer or admin account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="create-name">Name</Label>
              <Input
                id="create-name"
                value={createForm.name}
                onChange={(e) =>
                  setCreateForm({ ...createForm, name: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                value={createForm.email}
                onChange={(e) =>
                  setCreateForm({ ...createForm, email: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                value={createForm.password}
                onChange={(e) =>
                  setCreateForm({ ...createForm, password: e.target.value })
                }
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-role">Role</Label>
              <select
                id="create-role"
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm({
                    ...createForm,
                    role: e.target.value as UserRole,
                  })
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="organizer">Organizer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={loading === "create"}>
                {loading === "create" ? "Creating..." : "Create user"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
        </CardHeader>
        <CardContent>
          {users === undefined ? (
            <p className="text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-muted-foreground">No users yet.</p>
          ) : (
            <div className="space-y-4">
              {(users as UserRow[]).map((user) => (
                <div
                  key={user._id}
                  className="rounded-lg border border-border p-4"
                >
                  {editingId === user._id ? (
                    <form onSubmit={handleUpdate} className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Name</Label>
                        <Input
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm({ ...editForm, email: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <select
                          value={editForm.role}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              role: e.target.value as UserRole,
                            })
                          }
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        >
                          <option value="organizer">Organizer</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <Label>New password (optional)</Label>
                        <Input
                          type="password"
                          value={editForm.password}
                          onChange={(e) =>
                            setEditForm({ ...editForm, password: e.target.value })
                          }
                          minLength={8}
                          placeholder="Leave blank to keep current"
                        />
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <Button type="submit" disabled={loading === "update"}>
                          {loading === "update" ? "Saving..." : "Save"}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-medium">{user.name ?? "Unnamed"}</p>
                        <p className="text-sm text-muted-foreground">
                          {user.email ?? "No email"}
                        </p>
                        <p className="mt-1 text-xs uppercase tracking-wide text-primary">
                          {user.role}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={loading === `delete-${user._id}`}
                          onClick={() => void handleDelete(user._id, user.email)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
