"use client";
import { useState, useEffect, useCallback } from "react";
import {
	Users,
	Plus,
	Search,
	MoreHorizontal,
	Shield,
	Pencil,
	Trash2,
	X,
	Check,
	ChevronDown,
	UserCircle2,
	Mail,
	Eye,
	RefreshCw,
	Copy,
	UsersRound,
	FolderOpen,
	Loader2,
	AlertCircle,
	EyeOff,
	UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-hot-toast";

// ─── Constants ────────────────────────────────────────────────
// These match exactly what ensureDefaultRolesExist() seeds
const PRESET_ROLES = ["manager", "co-manager", "team_lead", "member"] as const;
type PresetRole = (typeof PRESET_ROLES)[number];

const ROLE_COLORS: Record<string, string> = {
	manager: "bg-blue-50 text-blue-700 border-blue-200",
	"co-manager": "bg-indigo-50 text-indigo-700 border-indigo-200",
	team_lead: "bg-violet-50 text-violet-700 border-violet-200",
	member: "bg-gray-100 text-gray-600 border-gray-200",
	// custom roles fall back to a teal style
	_custom: "bg-teal-50 text-teal-700 border-teal-200",
};

// Permissions that each role has (mirrors DB seed — display only)
const ROLE_PERMISSIONS: Record<string, string[]> = {
	manager: ["view", "edit", "create", "delete", "approve"],
	"co-manager": ["view", "edit", "create", "approve"],
	team_lead: ["view", "edit", "create", "approve"],
	member: ["view"],
};

// A role fetched from the API (global or org-scoped custom)
interface ApiRole {
	id: string;
	name: string;
	organizationId?: string | null;
}

const PERMISSION_COLORS: Record<string, string> = {
	view: "bg-sky-50 text-sky-700 border-sky-200",
	edit: "bg-violet-50 text-violet-700 border-violet-200",
	create: "bg-emerald-50 text-emerald-700 border-emerald-200",
	delete: "bg-red-50 text-red-700 border-red-200",
	approve: "bg-amber-50 text-amber-700 border-amber-200",
};

const TEAM_COLORS = [
	"bg-blue-500",
	"bg-violet-500",
	"bg-emerald-500",
	"bg-orange-500",
	"bg-pink-500",
	"bg-teal-500",
	"bg-rose-500",
	"bg-cyan-500",
];

// ─── Types ────────────────────────────────────────────────────
interface Team {
	id: string;
	name: string;
	color: string; // UI only — not stored in DB
	createdAt?: string;
	_memberCount?: number;
}

// A membership row: one user in one team with one role
interface Membership {
	id: string;
	userId: string;
	teamId: string;
	roleName: string; // can be preset or custom
	// Denormalized for display
	userName: string;
	userEmail: string;
	personalPermissions?: string[];
}

// The user being added (must already exist OR be created via sign-up API)
interface UserOption {
	id: string;
	name: string;
	email: string;
}

// ─── Utils ────────────────────────────────────────────────────
const generatePassword = () => {
	const chars =
		"ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
	return Array.from(
		{ length: 12 },
		() => chars[Math.floor(Math.random() * chars.length)],
	).join("");
};

const getInitials = (name: string) =>
	name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

const getTeamColor = (index: number) => TEAM_COLORS[index % TEAM_COLORS.length];

// ─── Permission Badge ─────────────────────────────────────────
const PermBadge = ({ perm }: { perm: string }) => (
	<span
		className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium ${PERMISSION_COLORS[perm] ?? "bg-gray-50 text-gray-500 border-gray-200"}`}
	>
		{perm}
	</span>
);

// ─── Role Badge ───────────────────────────────────────────────
const RoleBadge = ({ role }: { role: string }) => (
	<span
		className={`inline-flex items-center text-xs px-2.5 py-0.5 rounded-full border font-medium capitalize ${
			ROLE_COLORS[role] ?? ROLE_COLORS["_custom"]
		}`}
	>
		{role}
	</span>
);

// ─── Empty State ──────────────────────────────────────────────
const EmptyState = ({
	icon,
	title,
	sub,
	action,
}: {
	icon: React.ReactNode;
	title: string;
	sub: string;
	action?: React.ReactNode;
}) => (
	<div className="flex flex-col items-center justify-center py-20 text-center">
		<div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center mb-3 text-gray-300">
			{icon}
		</div>
		<p className="text-sm font-medium text-gray-500">{title}</p>
		<p className="text-xs text-gray-400 mt-1 mb-4">{sub}</p>
		{action}
	</div>
);

// ─── Spinner ──────────────────────────────────────────────────
const Spinner = ({ size = 16 }: { size?: number }) => (
	<Loader2 size={size} className="animate-spin text-blue-500" />
);

// ─── Team Modal ───────────────────────────────────────────────
const ALL_PERMISSIONS = [
	"view",
	"edit",
	"create",
	"delete",
	"approve",
] as const;
type Permission = (typeof ALL_PERMISSIONS)[number];

interface CustomRoleForm {
	id: string; // local UI key
	name: string;
	permissions: Permission[];
}

const TeamModal = ({
	onClose,
	onCreated,
}: {
	onClose: () => void;
	onCreated: (team: Team) => void;
}) => {
	const [name, setName] = useState("");
	const [saving, setSaving] = useState(false);

	// Custom roles with their own permission sets
	const [customRoles, setCustomRoles] = useState<CustomRoleForm[]>([]);
	const [roleInput, setRoleInput] = useState("");

	const addCustomRole = () => {
		const trimmed = roleInput.trim();
		if (!trimmed) return;
		const lower = trimmed.toLowerCase();
		if (
			PRESET_ROLES.includes(lower as PresetRole) ||
			customRoles.some((r) => r.name.toLowerCase() === lower)
		) {
			toast.error(`Role "${trimmed}" already exists.`);
			return;
		}
		setCustomRoles([
			...customRoles,
			{ id: Date.now().toString(), name: trimmed, permissions: ["view"] },
		]);
		setRoleInput("");
	};

	const removeCustomRole = (id: string) =>
		setCustomRoles(customRoles.filter((r) => r.id !== id));

	const togglePermission = (roleId: string, perm: Permission) => {
		setCustomRoles(
			customRoles.map((r) => {
				if (r.id !== roleId) return r;
				const has = r.permissions.includes(perm);
				// view is always required — cannot deselect it
				if (perm === "view" && has) return r;
				return {
					...r,
					permissions: has
						? r.permissions.filter((p) => p !== perm)
						: [...r.permissions, perm],
				};
			}),
		);
	};

	const handleSave = async () => {
		if (!name.trim()) {
			toast.error("Team name is required.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/teams", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				// Send { name, permissions[] } per custom role
				body: JSON.stringify({
					name: name.trim(),
					customRoles: customRoles.map((r) => ({
						name: r.name,
						permissions: r.permissions,
					})),
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.message ?? "Failed to create team.");
				return;
			}
			toast.success("Team created!");
			onCreated({ ...data.team, color: getTeamColor(Date.now()) });
		} catch {
			toast.error("Network error. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
							<UsersRound size={15} />
						</div>
						<div>
							<h2 className="text-sm font-semibold text-gray-800">
								Create Team
							</h2>
							<p className="text-xs text-gray-400">
								Name your team and define custom roles with permissions
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="text-gray-300 hover:text-gray-600 transition-colors"
					>
						<X size={17} />
					</button>
				</div>

				{/* Body */}
				<div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
					{/* Team Name */}
					<div className="space-y-1.5">
						<Label className="text-xs">Team Name</Label>
						<Input
							placeholder="e.g. IT Dev, Marketing, Design Studio"
							value={name}
							onChange={(e) => setName(e.target.value)}
							onKeyDown={(e) => e.key === "Enter" && handleSave()}
							autoFocus
						/>
					</div>

					{/* Default roles */}
					<div className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
						<div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
							<Shield size={12} className="text-blue-500" />
							Default roles (always included)
						</div>
						<div className="flex flex-wrap gap-1.5">
							{PRESET_ROLES.map((r) => (
								<RoleBadge key={r} role={r} />
							))}
						</div>
					</div>

					{/* Custom Roles builder */}
					<div className="space-y-3">
						<Label className="text-xs flex items-center gap-1.5">
							<Plus size={12} className="text-teal-500" />
							Custom roles{" "}
							<span className="text-gray-400 font-normal">(optional)</span>
						</Label>

						{/* Input row */}
						<div className="flex gap-2">
							<Input
								placeholder="e.g. DevOps, Frontend, Data Engineer, Intern…"
								value={roleInput}
								onChange={(e) => setRoleInput(e.target.value)}
								onKeyDown={(e) =>
									e.key === "Enter" && (e.preventDefault(), addCustomRole())
								}
								className="flex-1 text-sm"
							/>
							<button
								type="button"
								onClick={addCustomRole}
								className="flex items-center gap-1 text-xs px-3 py-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100 transition-colors font-medium shrink-0"
							>
								<Plus size={13} /> Add Role
							</button>
						</div>

						{/* Inline role cards with permission pickers */}
						{customRoles.length > 0 && (
							<div className="space-y-2">
								{customRoles.map((role) => (
									<div
										key={role.id}
										className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 space-y-2.5"
									>
										{/* Role name + remove */}
										<div className="flex items-center justify-between">
											<span className="text-xs font-semibold text-teal-800 capitalize flex items-center gap-1.5">
												<Shield size={11} className="text-teal-500" />
												{role.name}
											</span>
											<button
												onClick={() => removeCustomRole(role.id)}
												className="text-gray-300 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50"
											>
												<X size={13} />
											</button>
										</div>

										{/* Permission toggles */}
										<div className="flex flex-wrap gap-1.5">
											{ALL_PERMISSIONS.map((perm) => {
												const active = role.permissions.includes(perm);
												const locked = perm === "view"; // view is always on
												return (
													<button
														key={perm}
														type="button"
														onClick={() => togglePermission(role.id, perm)}
														title={
															locked ? "View is always required" : undefined
														}
														className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border font-medium transition-all capitalize ${
															active
																? PERMISSION_COLORS[perm] + " shadow-sm"
																: "bg-white border-gray-200 text-gray-400 hover:border-gray-300"
														} ${locked ? "cursor-default" : "cursor-pointer"}`}
													>
														{active && <Check size={10} />}
														{perm}
														{locked && (
															<span className="text-[9px] opacity-60">
																(always)
															</span>
														)}
													</button>
												);
											})}
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>

				{/* Footer */}
				<div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2 shrink-0">
					<Button variant="outline" onClick={onClose} className="text-sm">
						Cancel
					</Button>
					<Button
						onClick={handleSave}
						disabled={saving}
						className="text-sm cursor-pointer min-w-[110px]"
					>
						{saving ? (
							<span className="flex items-center gap-2">
								<Spinner size={14} /> Creating...
							</span>
						) : (
							`Create Team${customRoles.length > 0 ? ` + ${customRoles.length} role${customRoles.length > 1 ? "s" : ""}` : ""}`
						)}
					</Button>
				</div>
			</div>
		</div>
	);
};

// ─── Add Member Modal ─────────────────────────────────────────
// Step 1 — Create user via sign-up  POST /api/sign-up
// Step 2 — Assign to team           POST /api/team/members { targetUserId, teamId, roleName }
const AddMemberModal = ({
	teams,
	selectedTeamId,
	onClose,
	onAdded,
}: {
	teams: Team[];
	selectedTeamId: string | null;
	onClose: () => void;
	onAdded: (membership: Membership) => void;
}) => {
	const [step, setStep] = useState<"create" | "assign">("create");

	// Step 1 fields
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState(generatePassword());
	const [showPass, setShowPass] = useState(false);

	// Step 2 fields (Multiple assignments)
	interface AssignmentForm {
		id: string; // internal UI id
		teamId: string;
		roleName: string; // can be preset or custom
		personalPermissions: string[];
	}

	const [assignments, setAssignments] = useState<AssignmentForm[]>([
		{
			id: "init",
			teamId: selectedTeamId ?? teams[0]?.id ?? "",
			roleName: "member",
			personalPermissions: [],
		},
	]);

	const [createdUserId, setCreatedUserId] = useState<string | null>(null);

	// Roles loaded from API (global presets + custom org roles)
	const [availableRoles, setAvailableRoles] = useState<ApiRole[]>([]);

	useEffect(() => {
		fetch("/api/roles", { credentials: "include" })
			.then((r) => r.json())
			.then((d) => setAvailableRoles(d.roles ?? []))
			.catch(() => {
				/* silent – fall back to preset list */
			});
	}, []);

	// Combine: if API call failed, fall back to PRESET_ROLES
	const roleOptions: ApiRole[] =
		availableRoles.length > 0
			? availableRoles
			: PRESET_ROLES.map((r) => ({ id: r, name: r, organizationId: null }));

	const [saving, setSaving] = useState(false);

	// Step 1 — create the user account
	const handleCreateUser = async () => {
		if (!name.trim() || !email.trim()) {
			toast.error("Name and email are required.");
			return;
		}
		if (!password.trim()) {
			toast.error("Password is required.");
			return;
		}
		setSaving(true);
		try {
			const res = await fetch("/api/admin/users", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				credentials: "include",
				body: JSON.stringify({
					username: name.trim(),
					email: email.trim(),
					password,
				}),
			});
			const data = await res.json();
			if (!res.ok) {
				toast.error(data.message ?? "Failed to create user.");
				return;
			}
			setCreatedUserId(data.user?.id ?? data.id);
			toast.success("User account created!");
			setStep("assign");
		} catch {
			toast.error("Network error. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	// Step 2 — assign to team with role
	const handleAssign = async () => {
		if (!createdUserId) return;
		if (assignments.some((a) => !a.teamId)) {
			toast.error("Please select a team for all assignments.");
			return;
		}

		setSaving(true);
		try {
			for (const assignment of assignments) {
				const res = await fetch("/api/teams/members", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					credentials: "include",
					body: JSON.stringify({
						targetUserId: createdUserId,
						teamId: assignment.teamId,
						roleName: assignment.roleName,
						personalPermissions:
							assignment.personalPermissions.length > 0
								? assignment.personalPermissions
								: undefined,
					}),
				});
				const data = await res.json();
				if (!res.ok) {
					toast.error(
						data.message ??
							`Failed to assign member to ${teams.find((t) => t.id === assignment.teamId)?.name || "a team"}.`,
					);
					continue;
				}
				onAdded({
					id:
						data.membership?.id ??
						Date.now().toString() + Math.random().toString(),
					userId: createdUserId,
					teamId: assignment.teamId,
					roleName: assignment.roleName,
					userName: name,
					userEmail: email,
					personalPermissions:
						assignment.personalPermissions.length > 0
							? assignment.personalPermissions
							: undefined,
				});
			}
			toast.success(`${name} added to selected teams!`);
		} catch {
			toast.error("Network error. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4">
			<div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[92vh] flex flex-col">
				{/* Header */}
				<div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
					<div className="flex items-center gap-3">
						<div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
							<UserPlus size={15} />
						</div>
						<div>
							<h2 className="text-sm font-semibold text-gray-800">
								Add Team Member
							</h2>
							<p className="text-xs text-gray-400">
								{step === "create"
									? "Step 1 of 2 — Create account"
									: "Step 2 of 2 — Assign to team"}
							</p>
						</div>
					</div>
					<button
						onClick={onClose}
						className="text-gray-300 hover:text-gray-600 transition-colors"
					>
						<X size={17} />
					</button>
				</div>

				{/* Step indicator */}
				<div className="px-6 pt-4 shrink-0">
					<div className="flex items-center gap-2">
						{(["create", "assign"] as const).map((s, i) => (
							<div key={s} className="flex items-center gap-2 flex-1">
								<div
									className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
										step === s
											? "bg-blue-600 text-white"
											: (s === "assign" && step === "assign") ||
												  (s === "create" && step === "assign")
												? "bg-emerald-500 text-white"
												: "bg-gray-100 text-gray-400"
									}`}
								>
									{s === "create" && step === "assign" ? (
										<Check size={12} />
									) : (
										i + 1
									)}
								</div>
								<span
									className={`text-xs font-medium ${step === s ? "text-gray-800" : "text-gray-400"}`}
								>
									{s === "create" ? "Create Account" : "Assign to Team"}
								</span>
								{i === 0 && (
									<div
										className={`flex-1 h-px ${step === "assign" ? "bg-emerald-300" : "bg-gray-200"}`}
									/>
								)}
							</div>
						))}
					</div>
				</div>

				{/* Body */}
				<div className="px-6 py-5 space-y-5 overflow-y-auto flex-1">
					{step === "create" && (
						<>
							<div className="grid grid-cols-2 gap-3">
								<div className="space-y-1.5">
									<Label className="text-xs">Full Name</Label>
									<Input
										placeholder="Jane Doe"
										value={name}
										onChange={(e) => setName(e.target.value)}
									/>
								</div>
								<div className="space-y-1.5">
									<Label className="text-xs flex items-center gap-1">
										<Mail size={11} /> Email
									</Label>
									<Input
										type="email"
										placeholder="jane@sop.io"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
									/>
								</div>
							</div>

							<div className="space-y-1.5">
								<Label className="text-xs">Password</Label>
								<div className="flex gap-2">
									<div className="relative flex-1">
										<Input
											type={showPass ? "text" : "password"}
											value={password}
											onChange={(e) => setPassword(e.target.value)}
											className="pr-10 font-mono text-sm"
										/>
										<button
											type="button"
											onClick={() => setShowPass((p) => !p)}
											className="absolute inset-y-0 right-3 text-gray-400 hover:text-gray-600 flex items-center transition-colors"
										>
											{showPass ? <EyeOff size={14} /> : <Eye size={14} />}
										</button>
									</div>
									<button
										type="button"
										onClick={() => setPassword(generatePassword())}
										className="flex items-center gap-1.5 text-xs px-3 rounded-lg border border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600 transition-colors bg-white whitespace-nowrap"
									>
										<RefreshCw size={12} /> Generate
									</button>
									<button
										type="button"
										onClick={() => {
											navigator.clipboard.writeText(password);
											toast.success("Copied!");
										}}
										className="px-3 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-600 hover:border-gray-300 transition-colors bg-white"
									>
										<Copy size={13} />
									</button>
								</div>
								<p className="text-xs text-gray-400">
									Credentials will be emailed after account is created.
								</p>
							</div>

							<div className="flex items-start gap-2.5 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
								<Mail size={14} className="text-blue-500 mt-0.5 shrink-0" />
								<p className="text-xs text-blue-700">
									An email with login credentials will be sent to{" "}
									<strong>{email || "the member's email"}</strong>. Next you'll
									assign them to a team.
								</p>
							</div>
						</>
					)}

					{step === "assign" && (
						<>
							{/* User summary */}
							<div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100">
								<div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">
									{getInitials(name)}
								</div>
								<div className="min-w-0">
									<p className="text-xs font-semibold text-gray-800">{name}</p>
									<p className="text-xs text-gray-400">{email}</p>
								</div>
								<div className="ml-auto shrink-0">
									<span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
										Account created
									</span>
								</div>
							</div>

							{/* Assignments List */}
							<div className="space-y-4">
								{assignments.map((assignment, index) => {
									const selectedTeam = teams.find(
										(t) => t.id === assignment.teamId,
									);
									const rolePerms = ROLE_PERMISSIONS[assignment.roleName] ?? [];

									return (
										<div
											key={assignment.id}
											className="p-4 border border-gray-100 rounded-xl bg-white space-y-4 relative shadow-sm"
										>
											{assignments.length > 1 && (
												<button
													onClick={() =>
														setAssignments(
															assignments.filter((a) => a.id !== assignment.id),
														)
													}
													className="absolute top-4 right-4 text-gray-300 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50"
												>
													<X size={14} />
												</button>
											)}

											{/* Team select */}
											<div className="space-y-1.5 pr-8">
												<Label className="text-xs flex items-center gap-1.5">
													<UsersRound size={12} className="text-blue-500" />{" "}
													Select Team
												</Label>
												{teams.length === 0 ? (
													<div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
														<AlertCircle size={13} /> No teams exist yet.
													</div>
												) : (
													<div className="flex flex-wrap gap-2">
														{teams.map((team) => (
															<button
																key={team.id}
																type="button"
																onClick={() => {
																	const newA = [...assignments];
																	newA[index].teamId = team.id;
																	setAssignments(newA);
																}}
																className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
																	assignment.teamId === team.id
																		? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm"
																		: "bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300"
																}`}
															>
																<span
																	className={`w-2 h-2 rounded-full ${team.color}`}
																/>
																{team.name}
																{assignment.teamId === team.id && (
																	<Check size={11} />
																)}
															</button>
														))}
													</div>
												)}
											</div>

											{/* Role select & Permissions */}
											<div className="space-y-1.5">
												<Label className="text-xs flex items-center gap-1.5">
													<Shield size={12} className="text-blue-500" />
													Assign Role
													{selectedTeam && (
														<span className="text-gray-300 font-normal">
															in {selectedTeam.name}
														</span>
													)}
												</Label>
												<div className="relative">
													<select
														value={assignment.roleName}
														onChange={(e) => {
															const newA = [...assignments];
															newA[index].roleName = e.target.value;
															setAssignments(newA);
														}}
														className="w-full appearance-none border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-8 capitalize"
													>
														{/* Standard preset roles */}
														<optgroup label="Standard Roles">
															{roleOptions
																.filter((r) => !r.organizationId)
																.map((r) => (
																	<option
																		key={r.id}
																		value={r.name}
																		className="capitalize"
																	>
																		{r.name}
																	</option>
																))}
														</optgroup>
														{/* Custom org roles */}
														{roleOptions.some((r) => r.organizationId) && (
															<optgroup label="Custom Roles">
																{roleOptions
																	.filter((r) => r.organizationId)
																	.map((r) => (
																		<option
																			key={r.id}
																			value={r.name}
																			className="capitalize"
																		>
																			{r.name}
																		</option>
																	))}
															</optgroup>
														)}
													</select>
													<ChevronDown
														size={13}
														className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
													/>
												</div>

												{/* Permissions preview */}
												<div className="rounded-xl border border-gray-100 bg-gray-50 p-3 mt-2 space-y-1.5">
													<p className="text-xs text-gray-400 font-medium">
														Permissions granted by default
													</p>
													<div className="flex flex-wrap gap-1.5 opacity-50 grayscale">
														{/* Show from API data if available, else fall back to local map */}
														{(
															roleOptions.find(
																(r) => r.name === assignment.roleName,
															) as
																| (ApiRole & { permissions?: string[] })
																| undefined
														)?.permissions?.length
															? (
																	roleOptions.find(
																		(r) => r.name === assignment.roleName,
																	) as ApiRole & { permissions: string[] }
																).permissions.map((p) => (
																	<PermBadge key={p} perm={p} />
																))
															: rolePerms.map((p) => (
																	<PermBadge key={p} perm={p} />
																))}
													</div>
												</div>
											</div>

											{/* Personal Permissions Override */}
											<div className="space-y-2 pt-3 border-t border-gray-100">
												<Label className="text-xs flex items-center gap-1.5">
													<Shield size={12} className="text-amber-500" />
													Personal Permissions Override (Optional)
												</Label>
												<div className="flex flex-wrap gap-2 pt-1">
													{["view", "edit", "create", "delete", "approve"].map(
														(p) => {
															const isSelected =
																assignment.personalPermissions.includes(p);
															return (
																<label
																	key={p}
																	className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${isSelected ? "bg-amber-50 border-amber-200 text-amber-700 shadow-sm" : "bg-white border-gray-200 text-gray-500 hover:border-amber-200"}`}
																>
																	<input
																		type="checkbox"
																		className="hidden"
																		checked={isSelected}
																		onChange={(e) => {
																			const newA = [...assignments];
																			if (e.target.checked)
																				newA[index].personalPermissions.push(p);
																			else
																				newA[index].personalPermissions = newA[
																					index
																				].personalPermissions.filter(
																					(x) => x !== p,
																				);
																			setAssignments(newA);
																		}}
																	/>
																	{isSelected && <Check size={12} />}
																	<span className="capitalize">{p}</span>
																</label>
															);
														},
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>

							<Button
								variant="outline"
								className="w-full text-xs py-2 border border-dashed border-gray-300 text-gray-500 cursor-pointer hover:bg-gray-50"
								onClick={() =>
									setAssignments([
										...assignments,
										{
											id: Date.now().toString(),
											teamId: teams[0]?.id ?? "",
											roleName: "member",
											personalPermissions: [],
										},
									])
								}
							>
								<Plus size={14} className="mr-1" /> Add to another team
							</Button>
						</>
					)}
				</div>

				{/* Footer */}
				<div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center shrink-0">
					<div>
						{step === "assign" && (
							<button
								onClick={() => setStep("create")}
								className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
							>
								← Back
							</button>
						)}
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={onClose} className="text-sm">
							Cancel
						</Button>
						{step === "create" ? (
							<Button
								onClick={handleCreateUser}
								disabled={saving}
								className="text-sm cursor-pointer min-w-[130px]"
							>
								{saving ? (
									<span className="flex items-center gap-2">
										<Spinner size={14} /> Creating...
									</span>
								) : (
									"Create Account →"
								)}
							</Button>
						) : (
							<Button
								onClick={handleAssign}
								disabled={saving || assignments.length === 0}
								className="text-sm cursor-pointer min-w-[130px]"
							>
								{saving ? (
									<span className="flex items-center gap-2">
										<Spinner size={14} /> Assigning...
									</span>
								) : assignments.length > 1 ? (
									`Add to ${assignments.length} Teams`
								) : (
									"Add to Team"
								)}
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

// ─── Teams Tab ────────────────────────────────────────────────
const TeamsTab = ({
	teams,
	memberships,
	onCreateTeam,
	onDeleteTeam,
}: {
	teams: Team[];
	memberships: Membership[];
	onCreateTeam: () => void;
	onDeleteTeam: (id: string) => void;
}) => {
	const [menuOpen, setMenuOpen] = useState<string | null>(null);

	return (
		<div className="space-y-5">
			{/* KPIs */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{[
					{ label: "Total Teams", value: teams.length, color: "text-blue-600" },
					{
						label: "Total Members",
						value: new Set(memberships.map((m) => m.userId)).size,
						color: "text-violet-600",
					},
					{
						label: "Memberships",
						value: memberships.length,
						color: "text-emerald-600",
					},
					{
						label: "Roles in Use",
						value: new Set(memberships.map((m) => m.roleName)).size,
						color: "text-amber-500",
					},
				].map((k) => (
					<div
						key={k.label}
						className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
					>
						<p className="text-xs text-gray-400">{k.label}</p>
						<p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
					</div>
				))}
			</div>

			{teams.length === 0 ? (
				<EmptyState
					icon={<FolderOpen size={22} />}
					title="No teams yet"
					sub="Create your first team to get started"
					action={
						<Button onClick={onCreateTeam} className="text-xs gap-1.5">
							<Plus size={13} /> New Team
						</Button>
					}
				/>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{teams.map((team) => {
						const teamMemberships = memberships.filter(
							(m) => m.teamId === team.id,
						);
						const roleBreakdown = PRESET_ROLES.filter((r) =>
							teamMemberships.some((m) => m.roleName === r),
						);
						return (
							<div
								key={team.id}
								className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group p-5"
							>
								<div className="flex items-start justify-between mb-4">
									<div
										className={`w-10 h-10 rounded-xl ${team.color} flex items-center justify-center text-white shrink-0`}
									>
										<UsersRound size={18} />
									</div>
									<div className="relative">
										<button
											onClick={() =>
												setMenuOpen(menuOpen === team.id ? null : team.id)
											}
											className="p-1.5 rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
										>
											<MoreHorizontal size={15} />
										</button>
										{menuOpen === team.id && (
											<>
												<div
													className="fixed inset-0 z-10"
													onClick={() => setMenuOpen(null)}
												/>
												<div className="absolute right-0 top-8 z-20 bg-white border border-gray-100 rounded-xl shadow-lg w-36 py-1">
													<button
														onClick={() => {
															onDeleteTeam(team.id);
															setMenuOpen(null);
														}}
														className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
													>
														<Trash2 size={12} /> Delete
													</button>
												</div>
											</>
										)}
									</div>
								</div>

								<h3 className="text-sm font-semibold text-gray-800 mb-1">
									{team.name}
								</h3>
								<p className="text-xs text-gray-400 mb-3">
									<strong className="text-gray-700">
										{teamMemberships.length}
									</strong>{" "}
									{teamMemberships.length === 1 ? "member" : "members"}
									{team.createdAt && (
										<span className="ml-2 text-gray-300">
											· {team.createdAt}
										</span>
									)}
								</p>

								{/* Roles in use */}
								{roleBreakdown.length > 0 && (
									<div className="flex flex-wrap gap-1 pt-3 border-t border-gray-50">
										{roleBreakdown.map((r) => (
											<RoleBadge key={r} role={r} />
										))}
									</div>
								)}
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

// ─── Members Tab ──────────────────────────────────────────────
const MembersTab = ({
	memberships,
	teams,
	onDelete,
	onAddMember,
}: {
	memberships: Membership[];
	teams: Team[];
	onDelete: (id: string) => void;
	onAddMember: () => void;
}) => {
	const [search, setSearch] = useState("");
	const [filterTeam, setFilterTeam] = useState("All");
	const [filterRole, setFilterRole] = useState<PresetRole | "All">("All");
	const [menuOpen, setMenuOpen] = useState<string | null>(null);

	const filtered = memberships.filter((m) => {
		const s = search.toLowerCase();
		const matchSearch =
			m.userName.toLowerCase().includes(s) ||
			m.userEmail.toLowerCase().includes(s);
		const matchTeam = filterTeam === "All" || m.teamId === filterTeam;
		const matchRole = filterRole === "All" || m.roleName === filterRole;
		return matchSearch && matchTeam && matchRole;
	});

	return (
		<div className="space-y-4">
			{/* KPIs */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{[
					{
						label: "Total Memberships",
						value: memberships.length,
						color: "text-blue-600",
					},
					{
						label: "Unique Members",
						value: new Set(memberships.map((m) => m.userId)).size,
						color: "text-violet-600",
					},
					{
						label: "Multi-team",
						value: (() => {
							const c: Record<string, number> = {};
							memberships.forEach((m) => {
								c[m.userId] = (c[m.userId] ?? 0) + 1;
							});
							return Object.values(c).filter((v) => v > 1).length;
						})(),
						color: "text-emerald-600",
					},
					{ label: "Teams", value: teams.length, color: "text-amber-500" },
				].map((k) => (
					<div
						key={k.label}
						className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
					>
						<p className="text-xs text-gray-400">{k.label}</p>
						<p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
					</div>
				))}
			</div>

			{/* Filters */}
			<div className="flex flex-col sm:flex-row gap-2">
				<div className="relative flex-1">
					<Search
						size={14}
						className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
					/>
					<Input
						placeholder="Search by name or email..."
						className="pl-8 text-sm"
						value={search}
						onChange={(e) => setSearch(e.target.value)}
					/>
				</div>
				{/* Team filter */}
				<div className="relative">
					<select
						value={filterTeam}
						onChange={(e) => setFilterTeam(e.target.value)}
						className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-10"
					>
						<option value="All">All Teams</option>
						{teams.map((t) => (
							<option key={t.id} value={t.id}>
								{t.name}
							</option>
						))}
					</select>
					<ChevronDown
						size={13}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
					/>
				</div>
				{/* Role filter */}
				<div className="relative">
					<select
						value={filterRole}
						onChange={(e) =>
							setFilterRole(e.target.value as PresetRole | "All")
						}
						className="appearance-none border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-10 capitalize"
					>
						<option value="All">All Roles</option>
						{PRESET_ROLES.map((r) => (
							<option key={r} value={r} className="capitalize">
								{r}
							</option>
						))}
					</select>
					<ChevronDown
						size={13}
						className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
					/>
				</div>
			</div>

			{/* Table */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				{filtered.length === 0 ? (
					<EmptyState
						icon={<Users size={18} />}
						title="No members found"
						sub="Try adjusting your filters or add a new member"
						action={
							<Button onClick={onAddMember} className="text-xs gap-1.5">
								<Plus size={13} /> Add Member
							</Button>
						}
					/>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="bg-gray-50 border-b border-gray-100">
									{["Member", "Team", "Role", "Permissions", ""].map((h) => (
										<th
											key={h}
											className="text-left text-xs text-gray-400 font-medium px-5 py-3"
										>
											{h}
										</th>
									))}
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-50">
								{filtered.map((m) => {
									const team = teams.find((t) => t.id === m.teamId);
									const perms = ROLE_PERMISSIONS[m.roleName] ?? [];
									return (
										<tr
											key={m.id}
											className="hover:bg-gray-50 transition-colors"
										>
											<td className="px-5 py-3.5">
												<div className="flex items-center gap-3">
													<div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
														{getInitials(m.userName)}
													</div>
													<div>
														<p className="text-xs font-semibold text-gray-800">
															{m.userName}
														</p>
														<p className="text-xs text-gray-400 flex items-center gap-1">
															<Mail size={10} />
															{m.userEmail}
														</p>
													</div>
												</div>
											</td>
											<td className="px-5 py-3.5">
												{team ? (
													<span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-200 font-medium">
														<span
															className={`w-2 h-2 rounded-full ${team.color}`}
														/>
														{team.name}
													</span>
												) : (
													<span className="text-xs text-gray-300">—</span>
												)}
											</td>
											<td className="px-5 py-3.5">
												<RoleBadge role={m.roleName} />
											</td>
											<td className="px-5 py-3.5">
												<div className="flex flex-wrap gap-1">
													{m.personalPermissions &&
													m.personalPermissions.length > 0 ? (
														<>
															<span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center shrink-0 uppercase tracking-wider mr-1">
																OVERRIDE
															</span>
															{m.personalPermissions.map((p) => (
																<PermBadge key={p} perm={p} />
															))}
														</>
													) : (
														perms.map((p) => <PermBadge key={p} perm={p} />)
													)}
												</div>
											</td>
											<td className="px-5 py-3.5 relative">
												<button
													onClick={() =>
														setMenuOpen(menuOpen === m.id ? null : m.id)
													}
													className="text-gray-300 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
												>
													<MoreHorizontal size={15} />
												</button>
												{menuOpen === m.id && (
													<>
														<div
															className="fixed inset-0 z-10"
															onClick={() => setMenuOpen(null)}
														/>
														<div className="absolute right-4 top-10 z-20 bg-white border border-gray-100 rounded-xl shadow-lg w-40 py-1">
															<button
																onClick={() => {
																	onDelete(m.id);
																	setMenuOpen(null);
																}}
																className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-500 hover:bg-red-50"
															>
																<Trash2 size={12} /> Remove from Team
															</button>
														</div>
													</>
												)}
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
};

// ─── Roles Tab ───────────────────────────────────────────────
interface RoleWithPermissions extends ApiRole {
	permissions: string[];
}

const RolesTab = ({
	roles,
	memberships,
}: {
	roles: RoleWithPermissions[];
	memberships: Membership[];
}) => {
	const getMemberCount = (roleName: string) =>
		memberships.filter((m) => m.roleName === roleName).length;

	const presetRoles = roles.filter((r) => !r.organizationId);
	const customRoles = roles.filter((r) => r.organizationId);

	return (
		<div className="space-y-4">
			{/* KPIs */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
				{[
					{ label: "Total Roles", value: roles.length, color: "text-blue-600" },
					{
						label: "Standard",
						value: presetRoles.length,
						color: "text-indigo-600",
					},
					{
						label: "Custom",
						value: customRoles.length,
						color: "text-teal-600",
					},
					{
						label: "Roles in Use",
						value: new Set(memberships.map((m) => m.roleName)).size,
						color: "text-emerald-600",
					},
				].map((k) => (
					<div
						key={k.label}
						className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm"
					>
						<p className="text-xs text-gray-400">{k.label}</p>
						<p className={`text-2xl font-bold mt-1 ${k.color}`}>{k.value}</p>
					</div>
				))}
			</div>

			{/* Standard Roles */}
			{presetRoles.length > 0 && (
				<div>
					<p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
						<Shield size={12} className="text-blue-500" /> Standard Roles
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{presetRoles.map((role) => {
							const count = getMemberCount(role.name);
							return (
								<div
									key={role.id}
									className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3"
								>
									<div className="flex items-center justify-between">
										<RoleBadge role={role.name} />
										<span
											className={`text-xs font-semibold ${count > 0 ? "text-gray-700" : "text-gray-300"}`}
										>
											{count} {count === 1 ? "member" : "members"}
										</span>
									</div>
									<div className="space-y-1.5">
										<p className="text-xs text-gray-400 font-medium">
											Permissions
										</p>
										<div className="flex flex-wrap gap-1">
											{role.permissions.map((p) => (
												<PermBadge key={p} perm={p} />
											))}
										</div>
									</div>
									{count === 0 && (
										<span className="inline-block text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
											Unassigned
										</span>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{/* Custom Roles */}
			{customRoles.length > 0 && (
				<div>
					<p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1.5">
						<Plus size={12} className="text-teal-500" /> Custom Roles
					</p>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{customRoles.map((role) => {
							const count = getMemberCount(role.name);
							return (
								<div
									key={role.id}
									className="bg-white rounded-xl border border-teal-100 shadow-sm p-4 space-y-3"
								>
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<RoleBadge role={role.name} />
											<span className="text-[10px] font-semibold text-teal-600 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
												Custom
											</span>
										</div>
										<span
											className={`text-xs font-semibold ${count > 0 ? "text-gray-700" : "text-gray-300"}`}
										>
											{count} {count === 1 ? "member" : "members"}
										</span>
									</div>
									<div className="space-y-1.5">
										<p className="text-xs text-gray-400 font-medium">
											Permissions
										</p>
										<div className="flex flex-wrap gap-1">
											{role.permissions.length > 0 ? (
												role.permissions.map((p) => (
													<PermBadge key={p} perm={p} />
												))
											) : (
												<span className="text-xs text-gray-300 italic">
													No permissions set
												</span>
											)}
										</div>
									</div>
									{count === 0 && (
										<span className="inline-block text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
											Unassigned
										</span>
									)}
								</div>
							);
						})}
					</div>
				</div>
			)}

			{roles.length === 0 && (
				<EmptyState
					icon={<Shield size={18} />}
					title="No roles found"
					sub="Create a team to auto-seed standard roles, or add custom roles when creating a team"
				/>
			)}

			<div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2.5 mt-6">
				<Shield size={14} className="text-blue-500 mt-0.5 shrink-0" />
				<p className="text-xs text-blue-700">
					Roles and their permissions are <strong>globally managed</strong> or{" "}
					<strong>customized</strong> per organization. Permissions can be set
					when creating custom roles.
				</p>
			</div>
		</div>
	);
};

// ─── Main Page ────────────────────────────────────────────────
type Tab = "teams" | "members" | "roles";

export default function TeamPage() {
	const [tab, setTab] = useState<Tab>("teams");
	const [teams, setTeams] = useState<Team[]>([]);
	const [memberships, setMemberships] = useState<Membership[]>([]);
	const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
	const [loading, setLoading] = useState(true);

	const [teamModal, setTeamModal] = useState(false);
	const [memberModal, setMemberModal] = useState(false);

	// Fetch teams on mount
	const fetchTeams = useCallback(async () => {
		setLoading(true);
		try {
			const res = await fetch("/api/teams", { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				setTeams(
					(data.teams ?? []).map((t: Team, i: number) => ({
						...t,
						color: getTeamColor(i),
					})),
				);
			}
		} catch {
			/* silent */
		} finally {
			setLoading(false);
		}
	}, []);

	// Fetch memberships on mount
	const fetchMemberships = useCallback(async () => {
		try {
			const res = await fetch("/api/teams/members", { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				setMemberships(data.memberships ?? []);
			}
		} catch {
			/* silent */
		}
	}, []);

	// Fetch all available roles (preset + custom org roles)
	const fetchRoles = useCallback(async () => {
		try {
			const res = await fetch("/api/roles", { credentials: "include" });
			if (res.ok) {
				const data = await res.json();
				setRoles(data.roles ?? []);
			}
		} catch {
			/* silent */
		}
	}, []);

	useEffect(() => {
		fetchTeams();
		fetchMemberships();
		fetchRoles();
	}, [fetchTeams, fetchMemberships, fetchRoles]);

	const TABS: {
		key: Tab;
		label: string;
		icon: React.ReactNode;
		count: number;
	}[] = [
		{
			key: "teams",
			label: "Teams",
			icon: <UsersRound size={14} />,
			count: teams.length,
		},
		{
			key: "members",
			label: "Members",
			icon: <Users size={14} />,
			count: new Set(memberships.map((m) => m.userId)).size,
		},
		{
			key: "roles",
			label: "Roles",
			icon: <Shield size={14} />,
			count: roles.length,
		},
	];

	const ctaAction = () => {
		if (tab === "teams" || tab === "roles") setTeamModal(true);
		if (tab === "members") setMemberModal(true);
	};

	const ctaLabel: Record<Tab, string> = {
		teams: "New Team",
		members: "Add Member",
		roles: "New Team",
	};

	return (
		<div className="min-h-screen bg-gray-50">
			{/* Header */}
			<div className="bg-white border-b border-gray-100 px-6 py-4">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h1 className="text-sm font-semibold text-gray-800">
							Team Management
						</h1>
						<p className="text-xs text-gray-400">
							Manage teams, assign members and control role-based access
						</p>
					</div>
					<Button
						onClick={ctaAction}
						className="text-xs flex items-center gap-1.5 cursor-pointer"
					>
						<Plus size={13} /> {ctaLabel[tab]}
					</Button>
				</div>

				{/* Tabs */}
				<div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
					{TABS.map((t) => (
						<button
							key={t.key}
							onClick={() => setTab(t.key)}
							className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
								tab === t.key
									? "bg-white text-gray-800 shadow-sm"
									: "text-gray-400 hover:text-gray-600"
							}`}
						>
							{t.icon}
							{t.label}
							<span
								className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab === t.key ? "bg-blue-50 text-blue-600" : "bg-gray-200 text-gray-400"}`}
							>
								{t.count}
							</span>
						</button>
					))}
				</div>
			</div>

			{/* Content */}
			<div className="p-6">
				{loading ? (
					<div className="flex items-center justify-center py-20 gap-2 text-gray-400">
						<Spinner size={18} /> <span className="text-sm">Loading...</span>
					</div>
				) : (
					<>
						{tab === "teams" && (
							<TeamsTab
								teams={teams}
								memberships={memberships}
								onCreateTeam={() => setTeamModal(true)}
								onDeleteTeam={(id) =>
									setTeams((p) => p.filter((t) => t.id !== id))
								}
							/>
						)}
						{tab === "members" && (
							<MembersTab
								memberships={memberships}
								teams={teams}
								onAddMember={() => setMemberModal(true)}
								onDelete={(id) =>
									setMemberships((p) => p.filter((m) => m.id !== id))
								}
							/>
						)}
						{tab === "roles" && (
							<RolesTab roles={roles} memberships={memberships} />
						)}
					</>
				)}
			</div>

			{/* Modals */}
			{teamModal && (
				<TeamModal
					onClose={() => setTeamModal(false)}
					onCreated={(team) => {
						setTeams((p) => [...p, team]);
						setTeamModal(false);
						// Re-fetch roles so any new custom roles appear in the Roles tab
						fetchRoles();
					}}
				/>
			)}
			{memberModal && (
				<AddMemberModal
					teams={teams}
					selectedTeamId={null}
					onClose={() => setMemberModal(false)}
					onAdded={(membership) => {
						setMemberships((p) => [...p, membership]);
						setMemberModal(false);
					}}
				/>
			)}
		</div>
	);
}
