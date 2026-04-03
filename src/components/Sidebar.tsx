"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
	LayoutDashboard,
	Users,
	Building2,
	FileText,
	UserCheck,
	Settings,
	ClipboardList,
	CheckCircle2,
	LogOut,
	ChevronRight,
	Menu,
	X,
	UsersRound,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
type Role = "admin" | "employee" | "client";

interface NavItem {
	label: string;
	href: string;
	icon: React.ReactNode;
}

// ─── Nav config per role ──────────────────────────────────────
const NAV_ITEMS: Record<Role, NavItem[]> = {
	admin: [
		{
			label: "Dashboard",
			href: "/admin/dashboard",
			icon: <LayoutDashboard size={18} />,
		},
		{ label: "Team", href: "/admin/team", icon: <UsersRound size={18} /> },
		{ label: "Users", href: "/admin/users", icon: <Users size={18} /> },
		{ label: "Clients", href: "/admin/clients", icon: <Building2 size={18} /> },
		{
			label: "Settings",
			href: "/admin/settings",
			icon: <Settings size={18} />,
		},
	],
	employee: [
		{
			label: "Dashboard",
			href: "/employee/dashboard",
			icon: <LayoutDashboard size={18} />,
		},
		{
			label: "My SOPs",
			href: "/employee/sops",
			icon: <ClipboardList size={18} />,
		},
		{
			label: "Completed",
			href: "/employee/completed",
			icon: <CheckCircle2 size={18} />,
		},
		{
			label: "Settings",
			href: "/employee/settings",
			icon: <Settings size={18} />,
		},
	],
	client: [
		{
			label: "Dashboard",
			href: "/client/dashboard",
			icon: <LayoutDashboard size={18} />,
		},
		{
			label: "Projects",
			href: "/client/projects",
			icon: <Building2 size={18} />,
		},
		{
			label: "Documents",
			href: "/client/documents",
			icon: <FileText size={18} />,
		},
		{
			label: "Settings",
			href: "/client/settings",
			icon: <Settings size={18} />,
		},
	],
};

const ROLE_LABEL: Record<Role, string> = {
	admin: "Administrator",
	employee: "Employee",
	client: "Client",
};

// ─── Props ────────────────────────────────────────────────────
interface SidebarProps {
	role: Role;
	user: { name: string; email: string; avatar: string };
	collapsed: boolean;
	onCollapse: (v: boolean) => void;
	onLogout?: () => void;
}

// ─── Sidebar ─────────────────────────────────────────────────
export const Sidebar = ({
	role,
	user,
	collapsed,
	onCollapse,
	onLogout,
}: SidebarProps) => {
	const pathname = usePathname();
	const navItems = NAV_ITEMS[role];

	return (
		<>
			{/* Mobile overlay */}
			{!collapsed && (
				<div
					className="fixed inset-0 z-20 bg-black/20 backdrop-blur-sm lg:hidden"
					onClick={() => onCollapse(true)}
				/>
			)}

			<aside
				className={`
          fixed lg:relative z-30 lg:z-auto
          flex flex-col h-full
          bg-whit border-r border-gray-100
          transition-all duration-300 ease-in-out
          ${collapsed ? "w-0 lg:w-16 overflow-hidden" : "w-60"}
        `}
			>
				{/* Logo */}
				<div className="h-16 flex items-center justify-between px-4 border-b border-gray-100 shrink-0">
					{!collapsed && (
						<div className="flex items-center gap-2 overflow-hidden">
							<div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
								<ClipboardList size={14} className="text-white" />
							</div>
							<span className="font-bold text-gray-800 tracking-tight text-sm whitespace-nowrap">
								VUI Dashboard
							</span>
						</div>
					)}
					{collapsed && (
						<div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center mx-auto shrink-0">
							<ClipboardList size={14} className="text-white" />
						</div>
					)}
					{!collapsed && (
						<button
							onClick={() => onCollapse(true)}
							className="text-gray-300 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100 shrink-0"
							aria-label="Collapse sidebar"
						>
							<X size={16} />
						</button>
					)}
				</div>

				{/* Nav */}
				<nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
					{navItems.map((item) => {
						const isActive =
							pathname === item.href || pathname.startsWith(item.href + "/");
						return (
							<Link
								key={item.href}
								href={item.href}
								title={collapsed ? item.label : undefined}
								className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors
                  ${collapsed ? "justify-center" : ""}
                  ${isActive
										? "bg-blue-50 text-blue-700 font-medium"
										: "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
									}
                `}
							>
								<span className="shrink-0">{item.icon}</span>
								{!collapsed && (
									<>
										<span className="flex-1 whitespace-nowrap">
											{item.label}
										</span>
										{isActive && (
											<ChevronRight size={14} className="shrink-0" />
										)}
									</>
								)}
							</Link>
						);
					})}
				</nav>

				{/* User */}
				<div className="p-3 border-t border-gray-100 shrink-0">
					{collapsed ? (
						<div className="flex flex-col items-center gap-2">
							<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
								{user.avatar}
							</div>
							<button
								onClick={onLogout}
								title="Log out"
								className="text-gray-300 hover:text-red-400 transition-colors"
							>
								<LogOut size={15} />
							</button>
						</div>
					) : (
						<div className="flex items-center gap-3">
							<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
								{user.avatar}
							</div>
							<div className="min-w-0 flex-1">
								<p className="text-xs font-semibold text-gray-800 truncate">
									{user.name}
								</p>
								<p className="text-xs text-gray-400 truncate">
									{ROLE_LABEL[role]}
								</p>
							</div>
							<button
								onClick={onLogout}
								title="Log out"
								className="text-black hover:text-red-400 transition-colors shrink-0"
							>
								<LogOut size={15} />
							</button>
						</div>
					)}
				</div>
			</aside>
		</>
	);
};

// ─── Topbar toggle button (use in layout/dashboard) ───────────
export const SidebarToggle = ({
	collapsed,
	onToggle,
}: {
	collapsed: boolean;
	onToggle: () => void;
}) => (
	<button
		onClick={onToggle}
		className="text-gray-400 hover:text-gray-700 transition-colors p-1 rounded-lg hover:bg-gray-100"
		aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
	>
		<Menu size={18} />
	</button>
);
