"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuthUser, UserRole, usersService } from "../../services/api/users";

const AVAILABLE_ROLES: UserRole[] = ["admin", "editor", "viewer"];

const ROLE_BADGE_CLASS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-800 hover:bg-red-100",
  editor: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  viewer: "bg-gray-100 text-gray-800 hover:bg-gray-100",
};

export default function UserManagement() {
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [draftRoles, setDraftRoles] = useState<Record<string, UserRole>>({});

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const [me, allUsers] = await Promise.all([
        usersService.getMe(),
        usersService.getAll(),
      ]);
      setCurrentUserId(me.id);
      setUsers(allUsers);
      setDraftRoles(
        Object.fromEntries(allUsers.map((user) => [user.id, user.role])) as Record<
          string,
          UserRole
        >
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = (userId: string, role: UserRole) => {
    setDraftRoles((prev) => ({ ...prev, [userId]: role }));
  };

  const handleSaveRole = async (user: AuthUser) => {
    const nextRole = draftRoles[user.id];
    if (!nextRole || nextRole === user.role) return;
    if (user.id === currentUserId && user.role === "admin" && nextRole !== "admin") {
      toast.error("You cannot remove your own admin role");
      return;
    }

    try {
      setUpdatingUserId(user.id);
      const updatedUser = await usersService.updateRole(user.id, nextRole);
      setUsers((prev) =>
        prev.map((item) => (item.id === updatedUser.id ? updatedUser : item))
      );
      setDraftRoles((prev) => ({ ...prev, [updatedUser.id]: updatedUser.role }));
      toast.success(`Role updated for ${updatedUser.username}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role");
      setDraftRoles((prev) => ({ ...prev, [user.id]: user.role }));
    } finally {
      setUpdatingUserId(null);
    }
  };

  const formatDate = (dateString: string) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(dateString));

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">User Management</h3>
        <p className="text-sm text-gray-500">
          Manage roles for workspace users.
        </p>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Username</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>New Role</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isDirty = draftRoles[user.id] && draftRoles[user.id] !== user.role;
                const isUpdating = updatingUserId === user.id;
                return (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.username}
                      {user.id === currentUserId && (
                        <span className="ml-2 text-xs text-gray-500">(You)</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge className={ROLE_BADGE_CLASS[user.role]}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="w-[180px]">
                      <Select
                        value={draftRoles[user.id]}
                        onValueChange={(value) => handleRoleChange(user.id, value as UserRole)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          {AVAILABLE_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatDate(user.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleSaveRole(user)}
                        disabled={!isDirty || isUpdating}
                      >
                        {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
