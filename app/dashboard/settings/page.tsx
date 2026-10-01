"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import { tierName } from "@/lib/billing";
import { NotificationPreferences } from "@/components/dashboard/notification-preferences";
import type {
  ApiResponse,
  Invitation,
  OrganizationMember,
  OrganizationRole,
  User,
} from "@/types/api";

function roleLabel(role: OrganizationRole | null | undefined): string {
  if (role === null || role === undefined) return "—";
  if (typeof role === "number") {
    return ["Owner", "Admin", "Member"][role] ?? String(role);
  }
  return String(role);
}

function isAdminOrOwner(role: OrganizationRole | null | undefined): boolean {
  const label = roleLabel(role);
  return label === "Owner" || label === "Admin";
}

function initials(first: string, last: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";
}

function planLabel(plan: unknown): string {
  return tierName(plan);
}

export default function SettingsPage() {
  const { user, currentOrg, refresh } = useAuth();
  const canManage = isAdminOrOwner(currentOrg?.currentUserRole);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [orgName, setOrgName] = useState("");
  const [savingOrg, setSavingOrg] = useState(false);

  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Admin" | "Member">("Member");
  const [sendingInvite, setSendingInvite] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? "");
      setLastName(user.lastName ?? "");
    }
  }, [user]);

  useEffect(() => {
    if (currentOrg) {
      setOrgName(currentOrg.name);
    }
  }, [currentOrg]);

  const loadTeam = useCallback(async () => {
    if (!currentOrg) return;
    setLoadingTeam(true);
    try {
      const membersRes = await api.get<ApiResponse<OrganizationMember[]>>(
        `/api/organizations/${currentOrg.id}/members`
      );
      if (membersRes.data.success && membersRes.data.data) {
        setMembers(membersRes.data.data);
      }

      if (canManage) {
        const invitesRes = await api.get<ApiResponse<Invitation[]>>(
          `/api/organizations/${currentOrg.id}/invitations`
        );
        if (invitesRes.data.success && invitesRes.data.data) {
          setInvitations(invitesRes.data.data);
        }
      } else {
        setInvitations([]);
      }
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setLoadingTeam(false);
    }
  }, [currentOrg, canManage]);

  useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  const email = useMemo(() => user?.email ?? "", [user]);

  async function saveProfile() {
    setSavingProfile(true);
    try {
      const res = await api.patch<ApiResponse<User>>("/api/auth/profile", {
        firstName,
        lastName,
      });
      if (!res.data.success) {
        toast.error(res.data.message || "Failed to save profile.");
        return;
      }
      toast.success(res.data.message || "Profile saved.");
      await refresh();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match.");
      return;
    }
    setChangingPassword(true);
    try {
      const res = await api.post<ApiResponse<object>>("/api/auth/change-password", {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!res.data.success) {
        toast.error(res.data.message || "Failed to change password.");
        return;
      }
      toast.success(res.data.message || "Password changed.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setChangingPassword(false);
    }
  }

  async function saveOrganization() {
    if (!currentOrg || !canManage) return;
    setSavingOrg(true);
    try {
      const res = await api.patch<ApiResponse<unknown>>(`/api/organizations/${currentOrg.id}`, {
        name: orgName,
      });
      if (!res.data.success) {
        toast.error(res.data.message || "Failed to update organization.");
        return;
      }
      toast.success(res.data.message || "Organization updated.");
      await refresh();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setSavingOrg(false);
    }
  }

  async function sendInvite() {
    if (!currentOrg) return;
    setSendingInvite(true);
    try {
      const res = await api.post<ApiResponse<Invitation>>(
        `/api/organizations/${currentOrg.id}/invitations`,
        { email: inviteEmail, role: inviteRole }
      );
      if (!res.data.success) {
        toast.error(res.data.message || "Failed to send invite.");
        return;
      }
      toast.success(res.data.message || "Invitation sent.");
      setInviteEmail("");
      setInviteRole("Member");
      setInviteOpen(false);
      await loadTeam();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    } finally {
      setSendingInvite(false);
    }
  }

  async function changeMemberRole(userId: string, role: "Admin" | "Member") {
    if (!currentOrg) return;
    try {
      const res = await api.patch<ApiResponse<OrganizationMember>>(
        `/api/organizations/${currentOrg.id}/members/${userId}`,
        { role }
      );
      if (!res.data.success) {
        toast.error(res.data.message || "Failed to update role.");
        return;
      }
      toast.success("Role updated.");
      await loadTeam();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function removeMember(userId: string) {
    if (!currentOrg) return;
    try {
      const res = await api.delete<ApiResponse<object>>(
        `/api/organizations/${currentOrg.id}/members/${userId}`
      );
      if (!res.data.success) {
        toast.error(res.data.message || "Failed to remove member.");
        return;
      }
      toast.success("Member removed.");
      await loadTeam();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  async function revokeInvite(id: string) {
    if (!currentOrg) return;
    try {
      const res = await api.delete<ApiResponse<object>>(
        `/api/organizations/${currentOrg.id}/invitations/${id}`
      );
      if (!res.data.success) {
        toast.error(res.data.message || "Failed to revoke invitation.");
        return;
      }
      toast.success("Invitation revoked.");
      await loadTeam();
    } catch {
      // Error toast is shown by the global Axios interceptor (lib/api.ts).
    }
  }

  if (!user) {
    return <p className="text-slate-600">Loading settings…</p>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-600">Manage your profile, organization, and team.</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="h-auto flex-wrap justify-start">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="team">Team Members</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-8 pt-4">
          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-medium text-slate-900">Profile</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" value={email} disabled />
              </div>
            </div>
            <Button type="button" onClick={() => void saveProfile()} disabled={savingProfile}>
              {savingProfile ? "Saving…" : "Save profile"}
            </Button>
          </section>

          <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-medium text-slate-900">Change Password</h2>
            <div className="grid max-w-md gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void changePassword()}
              disabled={changingPassword}
            >
              {changingPassword ? "Updating…" : "Update password"}
            </Button>
          </section>
        </TabsContent>

        <TabsContent value="organization" className="space-y-4 pt-4">
          {!currentOrg ? (
            <p className="text-slate-600">No organization selected.</p>
          ) : (
            <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-6">
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-lg font-medium text-slate-900">Organization</h2>
                <Badge variant="secondary">{planLabel(currentOrg.plan)}</Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href="/dashboard/billing">Billing</Link>
                </Button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Org Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={!canManage}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgSlug">Slug</Label>
                  <Input id="orgSlug" value={currentOrg.slug} disabled />
                </div>
              </div>
              {canManage && (
                <Button type="button" onClick={() => void saveOrganization()} disabled={savingOrg}>
                  {savingOrg ? "Saving…" : "Save organization"}
                </Button>
              )}
            </section>
          )}
        </TabsContent>

        <TabsContent value="notifications" className="pt-4">
          <NotificationPreferences />
        </TabsContent>

        <TabsContent value="team" className="space-y-6 pt-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-medium text-slate-900">Team Members</h2>
            {canManage && (
              <Sheet open={inviteOpen} onOpenChange={setInviteOpen}>
                <SheetTrigger asChild>
                  <Button type="button">Invite Member</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Invite Member</SheetTitle>
                    <SheetDescription>
                      Send an email invitation. The invite expires in 48 hours.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="inviteEmail">Email</Label>
                      <Input
                        id="inviteEmail"
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="teammate@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Role</Label>
                      <Select
                        value={inviteRole}
                        onValueChange={(v) => setInviteRole(v as "Admin" | "Member")}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Member">Member</SelectItem>
                          <SelectItem value="Admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <SheetFooter className="mt-6">
                    <Button
                      type="button"
                      onClick={() => void sendInvite()}
                      disabled={sendingInvite || !inviteEmail.trim()}
                    >
                      {sendingInvite ? "Sending…" : "Send"}
                    </Button>
                  </SheetFooter>
                </SheetContent>
              </Sheet>
            )}
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingTeam ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-slate-500">
                      Loading…
                    </TableCell>
                  </TableRow>
                ) : members.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={canManage ? 5 : 4} className="text-slate-500">
                      No members found.
                    </TableCell>
                  </TableRow>
                ) : (
                  members.map((m) => {
                    const label = roleLabel(m.role);
                    const isOwner = label === "Owner";
                    return (
                      <TableRow key={m.userId}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback>
                                {initials(m.firstName, m.lastName)}
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              {m.firstName} {m.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{m.email}</TableCell>
                        <TableCell>
                          <Badge variant={isOwner ? "default" : "secondary"}>{label}</Badge>
                        </TableCell>
                        <TableCell>
                          {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                        </TableCell>
                        {canManage && (
                          <TableCell className="text-right">
                            {!isOwner && (
                              <div className="flex justify-end gap-2">
                                <Select
                                  value={label === "Admin" ? "Admin" : "Member"}
                                  onValueChange={(v) =>
                                    void changeMemberRole(m.userId, v as "Admin" | "Member")
                                  }
                                >
                                  <SelectTrigger className="h-8 w-[110px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Member">Member</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => void removeMember(m.userId)}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {canManage && (
            <section className="space-y-3">
              <h3 className="text-base font-medium text-slate-900">Pending invitations</h3>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Sent</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-slate-500">
                          No pending invitations.
                        </TableCell>
                      </TableRow>
                    ) : (
                      invitations.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell>{inv.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{roleLabel(inv.role)}</Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {new Date(inv.expiresAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => void revokeInvite(inv.id)}
                            >
                              Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </section>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
