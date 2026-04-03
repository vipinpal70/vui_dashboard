// src/app/admin/users/page.tsx
"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
import {
    Users, Search, MoreHorizontal, Shield, Pencil,
    Trash2, X, Check, ChevronDown, Mail, UsersRound,
    Loader2, AlertCircle, UserCircle2, BadgeCheck,
    RefreshCw, Plus, Eye, EyeOff, FilePen, PlusCircle,
    Eraser,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────
interface Permission { id: string; action: string }
interface Role { id: string; name: string; permissions: Permission[] }
interface Team { id: string; name: string }
interface Membership {
    id: string; teamId: string; roleId: string;
    team: Team; role: Role; personalPermissions: Permission[];
}
interface OrgUser {
    id: string; username: string; email: string;
    role: string; orgRole: string; approved: boolean;
    createAt: string; memberships: Membership[];
}
interface ApiTeam { id: string; name: string }
interface ApiRole { id: string; name: string; permissions?: Permission[]; organizationId?: string | null }

// ─── Constants ────────────────────────────────────────────────
const ALL_PERMISSIONS = ["view", "edit", "create", "delete", "approve"] as const;
type Perm = (typeof ALL_PERMISSIONS)[number];

const PERM_ICONS: Record<Perm, React.ReactNode> = {
    view: <Eye size={11} />,
    edit: <FilePen size={11} />,
    create: <PlusCircle size={11} />,
    delete: <Eraser size={11} />,
    approve: <BadgeCheck size={11} />,
};

const PERM_COLORS: Record<string, string> = {
    view: "bg-sky-50 text-sky-700 border-sky-200",
    edit: "bg-violet-50 text-violet-700 border-violet-200",
    create: "bg-emerald-50 text-emerald-700 border-emerald-200",
    delete: "bg-red-50 text-red-700 border-red-200",
    approve: "bg-amber-50 text-amber-700 border-amber-200",
};

const ORG_ROLE_COLORS: Record<string, string> = {
    owner: "bg-violet-50 text-violet-700 border-violet-200",
    admin: "bg-blue-50 text-blue-700 border-blue-200",
    member: "bg-gray-100 text-gray-600 border-gray-200",
};

const TEAM_PALETTE = [
    "bg-blue-500", "bg-violet-500", "bg-emerald-500",
    "bg-orange-500", "bg-pink-500", "bg-teal-500", "bg-rose-500", "bg-cyan-500",
];

const getTeamColor = (i: number) => TEAM_PALETTE[i % TEAM_PALETTE.length];
const getInitials = (n: string) => n.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

// ─── Shared UI ────────────────────────────────────────────────
const Spinner = ({ size = 16 }: { size?: number }) => (
    <Loader2 size={size} className="animate-spin text-blue-500" />
);

const PermBadge = ({ perm }: { perm: string }) => (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${PERM_COLORS[perm] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}>
        {PERM_ICONS[perm as Perm]} {perm}
    </span>
);

const OrgRoleBadge = ({ orgRole }: { orgRole: string }) => (
    <span className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${ORG_ROLE_COLORS[orgRole] ?? ORG_ROLE_COLORS.member}`}>
        {orgRole}
    </span>
);

const ApprovedBadge = ({ approved }: { approved: boolean }) => (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium ${approved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"}`}>
        {approved ? <><BadgeCheck size={11} /> Approved</> : <><AlertCircle size={11} /> Pending</>}
    </span>
);

// ─── Permission Toggle Row ────────────────────────────────────
const PermissionToggleRow = ({
    active, onChange, locked = false,
}: {
    active: Perm[]; onChange: (v: Perm[]) => void; locked?: boolean;
}) => {
    const toggle = (p: Perm) => {
        if (locked) return;
        onChange(active.includes(p) ? active.filter((x) => x !== p) : [...active, p]);
    };
    return (
        <div className="flex flex-wrap gap-1.5">
            {ALL_PERMISSIONS.map((p) => {
                const on = active.includes(p);
                return (
                    <button key={p} type="button" onClick={() => toggle(p)} disabled={locked}
                        className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border font-medium transition-all
              ${on ? PERM_COLORS[p] + " shadow-sm" : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300"}
              ${locked ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}>
                        {on ? <Check size={10} /> : PERM_ICONS[p]} {p}
                    </button>
                );
            })}
        </div>
    );
};

// ─── Team Membership Card (inside Edit Modal) ─────────────────
interface MembershipDraft {
    key: string;               // local UI key
    membershipId?: string;     // existing membership id (if editing)
    teamId: string;
    roleName: string;
    useOverride: boolean;
    overridePerms: Perm[];
    isNew: boolean;
    markedForRemoval: boolean;
}

const MembershipCard = ({
    draft, teams, roles, index, onChange, onToggleRemove,
}: {
    draft: MembershipDraft;
    teams: ApiTeam[];
    roles: ApiRole[];
    index: number;
    onChange: (updated: MembershipDraft) => void;
    onToggleRemove: () => void;
}) => {
    const presetRoles = roles.filter((r) => !r.organizationId);
    const customRoles = roles.filter((r) => r.organizationId);
    const rolePerms = roles.find((r) => r.name === draft.roleName)?.permissions?.map((p) => p.action as Perm) ?? [];

    return (
        <div className={`rounded-xl border p-4 space-y-3 transition-all ${draft.markedForRemoval
                ? "border-red-200 bg-red-50/40 opacity-60"
                : draft.isNew
                    ? "border-blue-200 bg-blue-50/30"
                    : "border-gray-100 bg-white shadow-sm"
            }`}>
            {/* Card header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-lg ${getTeamColor(index)} flex items-center justify-center text-white shrink-0`}>
                        <UsersRound size={11} />
                    </div>
                    {draft.isNew && (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                            New
                        </span>
                    )}
                </div>
                <button type="button" onClick={onToggleRemove}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border font-medium transition-all ${draft.markedForRemoval
                            ? "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                            : "bg-red-50 text-red-500 border-red-200 hover:bg-red-100"
                        }`}>
                    {draft.markedForRemoval ? <><RefreshCw size={11} /> Undo</> : <><Trash2 size={11} /> Remove</>}
                </button>
            </div>

            {draft.markedForRemoval ? (
                <p className="text-xs text-red-500 text-center py-1">
                    User will be removed from this team on save.
                </p>
            ) : (
                <>
                    {/* Team + Role selects */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <Label className="text-[11px] text-gray-400">Team</Label>
                            <div className="relative">
                                <select value={draft.teamId}
                                    onChange={(e) => onChange({ ...draft, teamId: e.target.value })}
                                    className="w-full appearance-none border border-gray-200 rounded-lg pl-3 pr-7 py-2 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <Label className="text-[11px] text-gray-400">Role</Label>
                            <div className="relative">
                                <select value={draft.roleName}
                                    onChange={(e) => onChange({ ...draft, roleName: e.target.value, overridePerms: [] })}
                                    className="w-full appearance-none border border-gray-200 rounded-lg pl-3 pr-7 py-2 text-xs text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 capitalize">
                                    {presetRoles.length > 0 && (
                                        <optgroup label="Standard">
                                            {presetRoles.map((r) => <option key={r.id} value={r.name} className="capitalize">{r.name}</option>)}
                                        </optgroup>
                                    )}
                                    {customRoles.length > 0 && (
                                        <optgroup label="Custom">
                                            {customRoles.map((r) => <option key={r.id} value={r.name} className="capitalize">{r.name}</option>)}
                                        </optgroup>
                                    )}
                                </select>
                                <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Default role permissions — read-only preview */}
                    {rolePerms.length > 0 && (
                        <div className="space-y-1.5">
                            <p className="text-[11px] text-gray-400 font-medium flex items-center gap-1">
                                <Shield size={10} className="text-gray-300" /> Default permissions from role
                            </p>
                            <div className="flex flex-wrap gap-1 opacity-50">
                                {rolePerms.map((p) => <PermBadge key={p} perm={p} />)}
                            </div>
                        </div>
                    )}

                    {/* Override toggle */}
                    <div className="pt-2 border-t border-gray-100">
                        <button type="button"
                            onClick={() => onChange({ ...draft, useOverride: !draft.useOverride, overridePerms: draft.useOverride ? [] : [...rolePerms] })}
                            className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all w-full ${draft.useOverride
                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                    : "bg-gray-50 text-gray-400 border-gray-200 hover:border-amber-200 hover:text-amber-600"
                                }`}>
                            <div className={`w-4 h-4 rounded flex items-center justify-center border ${draft.useOverride ? "bg-amber-500 border-amber-500" : "border-gray-300"}`}>
                                {draft.useOverride && <Check size={10} className="text-white" />}
                            </div>
                            {draft.useOverride ? "Override active — custom permissions applied" : "Override role permissions (optional)"}
                        </button>

                        {/* Override permission toggles */}
                        {draft.useOverride && (
                            <div className="mt-3 space-y-1.5">
                                <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1">
                                    <Shield size={10} /> Custom permissions — these replace role defaults
                                </p>
                                <PermissionToggleRow
                                    active={draft.overridePerms}
                                    onChange={(v) => onChange({ ...draft, overridePerms: v })}
                                />
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

// ─── Edit User Modal ──────────────────────────────────────────
const EditUserModal = ({
    user, teams, roles, onClose, onSaved,
}: {
    user: OrgUser; teams: ApiTeam[]; roles: ApiRole[];
    onClose: () => void; onSaved: (u: OrgUser) => void;
}) => {
    const [username, setUsername] = useState(user.username);
    const [orgRole, setOrgRole] = useState(user.orgRole);
    const [saving, setSaving] = useState(false);

    // Build drafts from existing memberships
    const [drafts, setDrafts] = useState<MembershipDraft[]>(
        user.memberships.map((m) => ({
            key: m.id,
            membershipId: m.id,
            teamId: m.teamId,
            roleName: m.role.name,
            useOverride: m.personalPermissions.length > 0,
            overridePerms: m.personalPermissions.map((p) => p.action as Perm),
            isNew: false,
            markedForRemoval: false,
        }))
    );

    const addTeam = () => {
        const available = teams.filter(
            (t) => !drafts.some((d) => d.teamId === t.id && !d.markedForRemoval)
        );
        if (available.length === 0) { toast.error("User is already in all teams."); return; }
        setDrafts([...drafts, {
            key: Date.now().toString(),
            teamId: available[0].id,
            roleName: "member",
            useOverride: false,
            overridePerms: [],
            isNew: true,
            markedForRemoval: false,
        }]);
    };

    const updateDraft = (key: string, updated: MembershipDraft) =>
        setDrafts((p) => p.map((d) => d.key === key ? updated : d));

    const toggleRemove = (key: string) =>
        setDrafts((p) => p.map((d) => d.key === key ? { ...d, markedForRemoval: !d.markedForRemoval } : d));

    const handleSave = async () => {
        if (!username.trim()) { toast.error("Username is required."); return; }
        setSaving(true);
        try {
            // 1. Update profile
            const profileRes = await fetch(`/api/admin/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ username: username.trim(), orgRole }),
            });
            if (!profileRes.ok) {
                const d = await profileRes.json();
                toast.error(d.message ?? "Failed to update profile.");
                return;
            }

            // 2. Remove marked memberships
            const toRemove = drafts.filter((d) => d.markedForRemoval && d.membershipId);
            for (const d of toRemove) {
                await fetch(`/api/teams/members/${d.membershipId}`, {
                    method: "DELETE",
                    credentials: "include",
                });
            }

            // 3. Upsert remaining memberships
            const toUpsert = drafts.filter((d) => !d.markedForRemoval);
            for (const d of toUpsert) {
                await fetch("/api/teams/members", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify({
                        targetUserId: user.id,
                        teamId: d.teamId,
                        roleName: d.roleName,
                        personalPermissions: d.useOverride && d.overridePerms.length > 0
                            ? d.overridePerms
                            : undefined,
                    }),
                });
            }

            toast.success("User updated!");

            // Build optimistic updated user
            const updatedMemberships: Membership[] = toUpsert.map((d) => {
                const team = teams.find((t) => t.id === d.teamId)!;
                const role = roles.find((r) => r.name === d.roleName) ?? { id: d.roleName, name: d.roleName, permissions: [] };
                return {
                    id: d.membershipId ?? d.key,
                    teamId: d.teamId,
                    roleId: role.id,
                    team,
                    role: { ...role, permissions: role.permissions ?? [] },
                    personalPermissions: d.useOverride
                        ? d.overridePerms.map((a, i) => ({ id: `${i}`, action: a }))
                        : [],
                };
            });

            onSaved({ ...user, username: username.trim(), orgRole, memberships: updatedMemberships });
        } catch {
            toast.error("Network error. Please try again.");
        } finally {
            setSaving(false);
        }
    };

    const activeCount = drafts.filter((d) => !d.markedForRemoval).length;
    const removedCount = drafts.filter((d) => d.markedForRemoval).length;
    const overrideCount = drafts.filter((d) => !d.markedForRemoval && d.useOverride).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[94vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">
                            {getInitials(user.username)}
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-gray-800">Edit User</h2>
                            <p className="text-xs text-gray-400">{user.email}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors">
                        <X size={17} />
                    </button>
                </div>

                {/* Summary strip */}
                {(removedCount > 0 || overrideCount > 0) && (
                    <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 flex items-center gap-3 text-xs shrink-0">
                        {removedCount > 0 && (
                            <span className="flex items-center gap-1 text-red-600 font-medium">
                                <Trash2 size={11} /> {removedCount} team{removedCount > 1 ? "s" : ""} will be removed
                            </span>
                        )}
                        {overrideCount > 0 && (
                            <span className="flex items-center gap-1 text-amber-700 font-medium">
                                <Shield size={11} /> {overrideCount} permission override{overrideCount > 1 ? "s" : ""} active
                            </span>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="px-6 py-5 space-y-6 overflow-y-auto flex-1">

                    {/* ── Profile ── */}
                    <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Profile</p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs">Username</Label>
                                <Input value={username} onChange={(e) => setUsername(e.target.value)} />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs">Email</Label>
                                <Input value={user.email} disabled className="bg-gray-50 text-gray-400 cursor-not-allowed" />
                            </div>
                        </div>
                    </div>

                    {/* ── Org Role ── */}
                    <div className="space-y-2">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                            <Shield size={11} className="text-blue-400" /> Organisation Role
                        </p>
                        <div className="flex gap-2">
                            {(["owner", "admin", "member"] as const).map((r) => (
                                <button key={r} type="button" onClick={() => setOrgRole(r)}
                                    className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-all capitalize ${orgRole === r
                                            ? ORG_ROLE_COLORS[r] + " shadow-sm"
                                            : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300"
                                        }`}>
                                    {r === orgRole && <Check size={10} className="inline mr-1" />}{r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ── Team Memberships ── */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                                <UsersRound size={11} className="text-blue-400" /> Team Memberships
                                <span className="font-normal text-gray-400 normal-case tracking-normal">
                                    ({activeCount} active{removedCount > 0 ? `, ${removedCount} removing` : ""})
                                </span>
                            </p>
                            <button type="button" onClick={addTeam}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors px-2.5 py-1 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100">
                                <Plus size={12} /> Add Team
                            </button>
                        </div>

                        {drafts.length === 0 ? (
                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-xl py-6">
                                <AlertCircle size={13} className="text-gray-300" />
                                Not assigned to any team. Click "Add Team" to assign.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {drafts.map((draft, i) => (
                                    <MembershipCard
                                        key={draft.key}
                                        draft={draft}
                                        teams={teams}
                                        roles={roles}
                                        index={i}
                                        onChange={(updated) => updateDraft(draft.key, updated)}
                                        onToggleRemove={() => toggleRemove(draft.key)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
                    <p className="text-xs text-gray-400">
                        {drafts.filter((d) => !d.markedForRemoval && d.useOverride).length > 0
                            ? "⚠ Overrides replace role-default permissions entirely."
                            : "Changes take effect immediately on save."}
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} className="text-sm">Cancel</Button>
                        <Button onClick={handleSave} disabled={saving} className="text-sm cursor-pointer min-w-[120px]">
                            {saving
                                ? <span className="flex items-center gap-2"><Spinner size={14} /> Saving...</span>
                                : `Save Changes${removedCount > 0 ? ` (−${removedCount})` : ""}`}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ─── User Detail Drawer ───────────────────────────────────────
const UserDrawer = ({ user, teams, onClose, onEdit }: {
    user: OrgUser; teams: ApiTeam[]; onClose: () => void; onEdit: () => void;
}) => (
    <div className="fixed inset-0 z-40 flex justify-end">
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
        <div className="relative z-50 w-full max-w-sm bg-white h-full shadow-2xl flex flex-col overflow-y-auto">
            <div className="px-6 py-5 border-b border-gray-100 shrink-0">
                <div className="flex items-start justify-between mb-4">
                    <button onClick={onClose} className="text-gray-300 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100">
                        <X size={16} />
                    </button>
                    <Button onClick={onEdit} className="text-xs gap-1.5 cursor-pointer">
                        <Pencil size={12} /> Edit User
                    </Button>
                </div>
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 text-lg font-bold flex items-center justify-center shrink-0">
                        {getInitials(user.username)}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-gray-800 truncate">{user.username}</h2>
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail size={11} />{user.email}</p>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <OrgRoleBadge orgRole={user.orgRole} />
                            <ApprovedBadge approved={user.approved} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 border-b border-gray-50">
                <div className="grid grid-cols-2 gap-3 text-xs">
                    {[
                        { label: "System Role", value: user.role },
                        { label: "Member Since", value: new Date(user.createAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) },
                        { label: "Teams", value: `${user.memberships.length} team${user.memberships.length !== 1 ? "s" : ""}` },
                        { label: "Overrides", value: `${user.memberships.filter((m) => m.personalPermissions.length > 0).length} active` },
                    ].map((info) => (
                        <div key={info.label} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                            <p className="text-gray-400 mb-0.5">{info.label}</p>
                            <p className="font-semibold text-gray-700 capitalize">{info.value}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="px-6 py-4 flex-1">
                <p className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1.5">
                    <UsersRound size={12} className="text-blue-500" /> Team Memberships
                </p>
                {user.memberships.length === 0 ? (
                    <div className="text-xs text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-xl px-4 py-5 text-center">
                        Not assigned to any team
                    </div>
                ) : (
                    <div className="space-y-3">
                        {user.memberships.map((m, i) => {
                            const hasOverride = m.personalPermissions.length > 0;
                            const perms = hasOverride ? m.personalPermissions : m.role.permissions;
                            return (
                                <div key={m.id} className="rounded-xl border border-gray-100 bg-white shadow-sm p-4 space-y-2.5">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-6 h-6 rounded-lg ${getTeamColor(i)} flex items-center justify-center text-white shrink-0`}>
                                            <UsersRound size={11} />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-800 flex-1">{m.team.name}</span>
                                        <span className="text-xs px-2 py-0.5 rounded-full border font-medium capitalize bg-gray-50 text-gray-600 border-gray-200">
                                            {m.role.name}
                                        </span>
                                    </div>
                                    {hasOverride && (
                                        <span className="inline-block text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                            Permission override active
                                        </span>
                                    )}
                                    <div className="flex flex-wrap gap-1">
                                        {perms.map((p) => <PermBadge key={p.id} perm={p.action} />)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    </div>
);

// ─── Main Page ────────────────────────────────────────────────
export default function UsersPage() {
    const [users, setUsers] = useState<OrgUser[]>([]);
    const [teams, setTeams] = useState<ApiTeam[]>([]);
    const [roles, setRoles] = useState<ApiRole[]>([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [filterRole, setFilterRole] = useState("All");
    const [filterTeam, setFilterTeam] = useState("All");
    const [filterApproved, setFilterApproved] = useState("All");

    const [drawerUser, setDrawerUser] = useState<OrgUser | null>(null);
    const [editUser, setEditUser] = useState<OrgUser | null>(null);
    const [menuOpen, setMenuOpen] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [uR, tR, rR] = await Promise.all([
                fetch("/api/admin/users", { credentials: "include" }),
                fetch("/api/teams", { credentials: "include" }),
                fetch("/api/roles", { credentials: "include" }),
            ]);
            if (uR.ok) { const d = await uR.json(); setUsers(d.users ?? []); }
            if (tR.ok) { const d = await tR.json(); setTeams(d.teams ?? []); }
            if (rR.ok) { const d = await rR.json(); setRoles(d.roles ?? []); }
        } catch { toast.error("Failed to load users."); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    const filtered = useMemo(() => users.filter((u) => {
        const s = search.toLowerCase();
        const matchSearch = u.username.toLowerCase().includes(s) || u.email.toLowerCase().includes(s);
        const matchRole = filterRole === "All" || u.orgRole === filterRole;
        const matchTeam = filterTeam === "All" || u.memberships.some((m) => m.teamId === filterTeam);
        const matchApproved = filterApproved === "All" || (filterApproved === "approved" ? u.approved : !u.approved);
        return matchSearch && matchRole && matchTeam && matchApproved;
    }), [users, search, filterRole, filterTeam, filterApproved]);

    const handleSaved = (updated: OrgUser) => {
        setUsers((p) => p.map((u) => u.id === updated.id ? updated : u));
        setEditUser(null);
        if (drawerUser?.id === updated.id) setDrawerUser(updated);
    };

    const handleDelete = async (userId: string) => {
        if (!confirm("Remove this user from the organisation?")) return;
        try {
            const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE", credentials: "include" });
            if (res.ok) {
                setUsers((p) => p.filter((u) => u.id !== userId));
                toast.success("User removed.");
                if (drawerUser?.id === userId) setDrawerUser(null);
            } else {
                const d = await res.json();
                toast.error(d.message ?? "Failed to remove user.");
            }
        } catch { toast.error("Network error."); }
        setMenuOpen(null);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="bg-white border-b border-gray-100 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-sm font-semibold text-gray-800">Organisation Users</h1>
                        <p className="text-xs text-gray-400">View, edit and manage all users in your organisation</p>
                    </div>
                    <Button onClick={fetchAll} variant="outline" className="text-xs gap-1.5 cursor-pointer">
                        <RefreshCw size={13} /> Refresh
                    </Button>
                </div>
            </div>

            <div className="p-6 space-y-5">
                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: "Total Users", value: users.length, color: "text-blue-600", bg: "bg-blue-50", icon: <Users size={16} /> },
                        { label: "Active", value: users.filter((u) => u.approved).length, color: "text-emerald-600", bg: "bg-emerald-50", icon: <BadgeCheck size={16} /> },
                        { label: "Admins/Owners", value: users.filter((u) => u.orgRole === "admin" || u.orgRole === "owner").length, color: "text-violet-600", bg: "bg-violet-50", icon: <Shield size={16} /> },
                        { label: "With Overrides", value: users.filter((u) => u.memberships.some((m) => m.personalPermissions.length > 0)).length, color: "text-amber-600", bg: "bg-amber-50", icon: <Shield size={16} /> },
                    ].map((k) => (
                        <div key={k.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs text-gray-400">{k.label}</p>
                                <div className={`w-7 h-7 rounded-lg ${k.bg} ${k.color} flex items-center justify-center`}>{k.icon}</div>
                            </div>
                            <p className={`text-2xl font-bold ${k.color}`}>{k.value}</p>
                        </div>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2">
                    <div className="relative flex-1">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <Input placeholder="Search by name or email..." className="pl-8 text-sm"
                            value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    {[
                        { value: filterRole, onChange: setFilterRole, options: [{ v: "All", l: "All Roles" }, { v: "owner", l: "Owner" }, { v: "admin", l: "Admin" }, { v: "member", l: "Member" }] },
                        { value: filterTeam, onChange: setFilterTeam, options: [{ v: "All", l: "All Teams" }, ...teams.map((t) => ({ v: t.id, l: t.name }))] },
                        { value: filterApproved, onChange: setFilterApproved, options: [{ v: "All", l: "All Status" }, { v: "approved", l: "Approved" }, { v: "pending", l: "Pending" }] },
                    ].map((sel, i) => (
                        <div key={i} className="relative">
                            <select value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
                                className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-10">
                                {sel.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
                            </select>
                            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                        </div>
                    ))}
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
                            <Spinner size={18} /> <span className="text-sm">Loading users...</span>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 text-gray-300"><Users size={22} /></div>
                            <p className="text-sm font-medium text-gray-500">No users found</p>
                            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-50 border-b border-gray-100">
                                        {["User", "Org Role", "Teams", "Permissions", "Status", "Joined", ""].map((h) => (
                                            <th key={h} className="text-left text-xs text-gray-400 font-medium px-5 py-3">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => setDrawerUser(user)}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
                                                        {getInitials(user.username)}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-semibold text-gray-800">{user.username}</p>
                                                        <p className="text-xs text-gray-400 flex items-center gap-1"><Mail size={10} />{user.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                                                <OrgRoleBadge orgRole={user.orgRole} />
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-wrap gap-1">
                                                    {user.memberships.length === 0 ? (
                                                        <span className="text-xs text-gray-300">—</span>
                                                    ) : user.memberships.slice(0, 2).map((m, i) => (
                                                        <span key={m.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium">
                                                            <span className={`w-1.5 h-1.5 rounded-full ${getTeamColor(i)}`} />{m.team.name}
                                                        </span>
                                                    ))}
                                                    {user.memberships.length > 2 && (
                                                        <span className="text-xs text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">+{user.memberships.length - 2}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <div className="flex flex-wrap gap-1 items-center">
                                                    {user.memberships[0] ? (
                                                        <>
                                                            {user.memberships[0].personalPermissions.length > 0 && (
                                                                <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md uppercase tracking-wider">Override</span>
                                                            )}
                                                            {(user.memberships[0].personalPermissions.length > 0
                                                                ? user.memberships[0].personalPermissions
                                                                : user.memberships[0].role.permissions
                                                            ).slice(0, 3).map((p) => <PermBadge key={p.id} perm={p.action} />)}
                                                            {user.memberships[0].role.permissions.length > 3 && (
                                                                <span className="text-xs text-gray-400">+more</span>
                                                            )}
                                                        </>
                                                    ) : <span className="text-xs text-gray-300">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                                                <ApprovedBadge approved={user.approved} />
                                            </td>
                                            <td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                                                {new Date(user.createAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                            </td>
                                            <td className="px-5 py-3.5 relative" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                                                    className="text-gray-300 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                                                    <MoreHorizontal size={15} />
                                                </button>
                                                {menuOpen === user.id && (
                                                    <>
                                                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                                                        <div className="absolute right-4 top-10 z-20 bg-white border border-gray-100 rounded-xl shadow-lg w-40 py-1">
                                                            <button onClick={() => { setDrawerUser(user); setMenuOpen(null); }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                                                                <UserCircle2 size={13} /> View Details
                                                            </button>
                                                            <button onClick={() => { setEditUser(user); setMenuOpen(null); }}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
                                                                <Pencil size={13} /> Edit User
                                                            </button>
                                                            <button onClick={() => handleDelete(user.id)}
                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50">
                                                                <Trash2 size={13} /> Remove
                                                            </button>
                                                        </div>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {drawerUser && (
                <UserDrawer user={drawerUser} teams={teams}
                    onClose={() => setDrawerUser(null)}
                    onEdit={() => { setEditUser(drawerUser); setDrawerUser(null); }} />
            )}

            {editUser && (
                <EditUserModal user={editUser} teams={teams} roles={roles}
                    onClose={() => setEditUser(null)} onSaved={handleSaved} />
            )}
        </div>
    );
}