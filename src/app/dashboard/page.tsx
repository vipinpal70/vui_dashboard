"use client";
import { useState } from "react";
import {
	LayoutDashboard,
	Users,
	FileText,
	Settings,
	LogOut,
	Bell,
	TrendingUp,
	CheckCircle2,
	Clock,
	AlertCircle,
	ChevronRight,
	Menu,
	X,
	Building2,
	UserCheck,
	ClipboardList,
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";

// --- Types ---
type Role = "admin" | "employee" | "client";

interface User {
	name: string;
	role: Role;
	avatar: string;
}

// --- Mock Data ---
const MOCK_USER: User = { name: "Sarah Mitchell", role: "admin", avatar: "SM" };

const KPI_DATA: Record<
	Role,
	{
		label: string;
		value: string;
		change: string;
		positive: boolean;
		icon: React.ReactNode;
	}[]
> = {
	admin: [
		{
			label: "Total Employees",
			value: "124",
			change: "+4 this month",
			positive: true,
			icon: <Users size={18} />,
		},
		{
			label: "Active Clients",
			value: "38",
			change: "+2 this week",
			positive: true,
			icon: <Building2 size={18} />,
		},
		{
			label: "SOPs Published",
			value: "215",
			change: "+12 this month",
			positive: true,
			icon: <FileText size={18} />,
		},
		{
			label: "Pending Reviews",
			value: "7",
			change: "-3 from last week",
			positive: true,
			icon: <Clock size={18} />,
		},
	],
	employee: [
		{
			label: "Assigned SOPs",
			value: "18",
			change: "+2 new",
			positive: true,
			icon: <ClipboardList size={18} />,
		},
		{
			label: "Completed",
			value: "14",
			change: "78% completion",
			positive: true,
			icon: <CheckCircle2 size={18} />,
		},
		{
			label: "Overdue",
			value: "2",
			change: "Action needed",
			positive: false,
			icon: <AlertCircle size={18} />,
		},
		{
			label: "In Progress",
			value: "2",
			change: "Due this week",
			positive: true,
			icon: <Clock size={18} />,
		},
	],
	client: [
		{
			label: "Active Projects",
			value: "5",
			change: "+1 new",
			positive: true,
			icon: <Building2 size={18} />,
		},
		{
			label: "SOPs Shared",
			value: "42",
			change: "+6 this month",
			positive: true,
			icon: <FileText size={18} />,
		},
		{
			label: "Approvals Pending",
			value: "3",
			change: "Needs review",
			positive: false,
			icon: <Clock size={18} />,
		},
		{
			label: "Completed SOPs",
			value: "39",
			change: "93% done",
			positive: true,
			icon: <CheckCircle2 size={18} />,
		},
	],
};

const ACTIVITY_DATA: Record<
	Role,
	{
		user: string;
		action: string;
		target: string;
		time: string;
		status: "completed" | "pending" | "overdue";
	}[]
> = {
	admin: [
		{
			user: "James Cole",
			action: "Submitted",
			target: "Onboarding SOP v3",
			time: "2 min ago",
			status: "pending",
		},
		{
			user: "Priya Nair",
			action: "Completed",
			target: "Safety Protocol #12",
			time: "18 min ago",
			status: "completed",
		},
		{
			user: "Tom Harris",
			action: "Overdue",
			target: "Client Handoff SOP",
			time: "1 hr ago",
			status: "overdue",
		},
		{
			user: "Liu Wei",
			action: "Published",
			target: "IT Setup Checklist",
			time: "3 hr ago",
			status: "completed",
		},
		{
			user: "Ana Souza",
			action: "Requested review",
			target: "HR Policy Update",
			time: "5 hr ago",
			status: "pending",
		},
	],
	employee: [
		{
			user: "You",
			action: "Completed",
			target: "Equipment Safety SOP",
			time: "30 min ago",
			status: "completed",
		},
		{
			user: "Manager",
			action: "Assigned",
			target: "Client Onboarding Flow",
			time: "2 hr ago",
			status: "pending",
		},
		{
			user: "You",
			action: "Started",
			target: "Weekly Compliance Check",
			time: "Yesterday",
			status: "pending",
		},
		{
			user: "Team Lead",
			action: "Flagged",
			target: "Data Entry SOP",
			time: "Yesterday",
			status: "overdue",
		},
		{
			user: "You",
			action: "Completed",
			target: "Incident Report Form",
			time: "2 days ago",
			status: "completed",
		},
	],
	client: [
		{
			user: "Your team",
			action: "Approved",
			target: "Q4 Workflow SOP",
			time: "1 hr ago",
			status: "completed",
		},
		{
			user: "Admin",
			action: "Shared",
			target: "New Compliance Doc",
			time: "3 hr ago",
			status: "pending",
		},
		{
			user: "Your team",
			action: "Reviewing",
			target: "Service Level Agreement",
			time: "Yesterday",
			status: "pending",
		},
		{
			user: "Admin",
			action: "Updated",
			target: "Project Scope SOP",
			time: "2 days ago",
			status: "completed",
		},
		{
			user: "Your team",
			action: "Overdue review",
			target: "Vendor Checklist",
			time: "3 days ago",
			status: "overdue",
		},
	],
};

const NAV_ITEMS: Record<
	Role,
	{ label: string; icon: React.ReactNode; active?: boolean }[]
> = {
	admin: [
		{ label: "Dashboard", icon: <LayoutDashboard size={18} />, active: true },
		{ label: "Employees", icon: <Users size={18} /> },
		{ label: "Clients", icon: <Building2 size={18} /> },
		{ label: "SOPs", icon: <FileText size={18} /> },
		{ label: "Reviews", icon: <UserCheck size={18} /> },
		{ label: "Settings", icon: <Settings size={18} /> },
	],
	employee: [
		{ label: "Dashboard", icon: <LayoutDashboard size={18} />, active: true },
		{ label: "My SOPs", icon: <ClipboardList size={18} /> },
		{ label: "Completed", icon: <CheckCircle2 size={18} /> },
		{ label: "Settings", icon: <Settings size={18} /> },
	],
	client: [
		{ label: "Dashboard", icon: <LayoutDashboard size={18} />, active: true },
		{ label: "Projects", icon: <Building2 size={18} /> },
		{ label: "Documents", icon: <FileText size={18} /> },
		{ label: "Settings", icon: <Settings size={18} /> },
	],
};

// --- Simple Bar Chart ---
const BarChart = ({ role }: { role: Role }) => {
	const data: Record<Role, { label: string; value: number; color: string }[]> =
		{
			admin: [
				{ label: "Jan", value: 65, color: "#3b82f6" },
				{ label: "Feb", value: 78, color: "#3b82f6" },
				{ label: "Mar", value: 90, color: "#3b82f6" },
				{ label: "Apr", value: 81, color: "#3b82f6" },
				{ label: "May", value: 56, color: "#3b82f6" },
				{ label: "Jun", value: 95, color: "#3b82f6" },
				{ label: "Jul", value: 110, color: "#6366f1" },
			],
			employee: [
				{ label: "Mon", value: 3, color: "#3b82f6" },
				{ label: "Tue", value: 5, color: "#3b82f6" },
				{ label: "Wed", value: 2, color: "#3b82f6" },
				{ label: "Thu", value: 6, color: "#3b82f6" },
				{ label: "Fri", value: 4, color: "#6366f1" },
				{ label: "Sat", value: 1, color: "#3b82f6" },
				{ label: "Sun", value: 0, color: "#3b82f6" },
			],
			client: [
				{ label: "Jan", value: 8, color: "#3b82f6" },
				{ label: "Feb", value: 12, color: "#3b82f6" },
				{ label: "Mar", value: 10, color: "#3b82f6" },
				{ label: "Apr", value: 15, color: "#6366f1" },
				{ label: "May", value: 9, color: "#3b82f6" },
				{ label: "Jun", value: 14, color: "#3b82f6" },
				{ label: "Jul", value: 11, color: "#3b82f6" },
			],
		};

	const bars = data[role];
	const max = Math.max(...bars.map((b) => b.value));

	return (
		<div className="flex items-end gap-2 h-36 w-full">
			{bars.map((bar, i) => (
				<div key={i} className="flex flex-col items-center gap-1 flex-1">
					<div
						className="w-full rounded-t-sm transition-all duration-500"
						style={{
							height: `${(bar.value / max) * 128}px`,
							backgroundColor: bar.color,
							opacity: 0.85,
						}}
					/>
					<span className="text-xs text-gray-400">{bar.label}</span>
				</div>
			))}
		</div>
	);
};

// --- Donut Chart ---
const DonutChart = ({ role }: { role: Role }) => {
	const data: Record<Role, { label: string; value: number; color: string }[]> =
		{
			admin: [
				{ label: "Completed", value: 68, color: "#22c55e" },
				{ label: "In Progress", value: 20, color: "#3b82f6" },
				{ label: "Pending", value: 12, color: "#f59e0b" },
			],
			employee: [
				{ label: "Completed", value: 78, color: "#22c55e" },
				{ label: "In Progress", value: 11, color: "#3b82f6" },
				{ label: "Overdue", value: 11, color: "#ef4444" },
			],
			client: [
				{ label: "Approved", value: 93, color: "#22c55e" },
				{ label: "Pending", value: 7, color: "#f59e0b" },
			],
		};

	const segments = data[role];
	const total = segments.reduce((s, d) => s + d.value, 0);
	let cumulative = 0;
	const radius = 40;
	const cx = 60;
	const cy = 60;
	const circumference = 2 * Math.PI * radius;

	return (
		<div className="flex items-center gap-6">
			<svg width="120" height="120" viewBox="0 0 120 120">
				{segments.map((seg, i) => {
					const offset = circumference * (1 - cumulative / total);
					const dash = circumference * (seg.value / total);
					cumulative += seg.value;
					return (
						<circle
							key={i}
							cx={cx}
							cy={cy}
							r={radius}
							fill="none"
							stroke={seg.color}
							strokeWidth="18"
							strokeDasharray={`${dash} ${circumference - dash}`}
							strokeDashoffset={offset}
							style={{
								transform: "rotate(-90deg)",
								transformOrigin: "60px 60px",
							}}
						/>
					);
				})}
				<text
					x={cx}
					y={cy + 5}
					textAnchor="middle"
					fontSize="13"
					fontWeight="bold"
					fill="#1e293b"
				>
					{total}%
				</text>
			</svg>
			<div className="space-y-2">
				{segments.map((seg, i) => (
					<div key={i} className="flex items-center gap-2">
						<div
							className="w-2.5 h-2.5 rounded-full shrink-0"
							style={{ backgroundColor: seg.color }}
						/>
						<span className="text-xs text-gray-500">{seg.label}</span>
						<span className="text-xs font-semibold text-gray-700 ml-auto pl-4">
							{seg.value}%
						</span>
					</div>
				))}
			</div>
		</div>
	);
};

// --- Status Badge ---
const StatusBadge = ({
	status,
}: {
	status: "completed" | "pending" | "overdue";
}) => {
	const styles = {
		completed: "bg-green-50 text-green-700 border border-green-200",
		pending: "bg-amber-50 text-amber-700 border border-amber-200",
		overdue: "bg-red-50 text-red-700 border border-red-200",
	};
	return (
		<span
			className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status]}`}
		>
			{status.charAt(0).toUpperCase() + status.slice(1)}
		</span>
	);
};

// --- Main Dashboard ---
export default function Dashboard() {
	const [role, setRole] = useState<Role>("admin");
	const [sidebarOpen, setSidebarOpen] = useState(true);

	const user: User = { ...MOCK_USER, role };
	const kpis = KPI_DATA[role];
	const activity = ACTIVITY_DATA[role];
	const navItems = NAV_ITEMS[role];

	const roleLabel: Record<Role, string> = {
		admin: "Administrator",
		employee: "Employee",
		client: "Client",
	};
	const roleColor: Record<Role, string> = {
		admin: "bg-violet-100 text-violet-700",
		employee: "bg-blue-100 text-blue-700",
		client: "bg-emerald-100 text-emerald-700",
	};

	return (
		<div className="flex min-h-screen bg-gray-50 font-sans">
			{/* Sidebar */}
			<aside
				className={`${sidebarOpen ? "w-60" : "w-0 overflow-hidden"} transition-all duration-300 bg-white border-r border-gray-100 flex flex-col shrink-0`}
			>
				{/* Logo */}
				<div className="h-16 flex items-center px-6 border-b border-gray-100">
					<div className="flex items-center gap-2">
						<div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
							<ClipboardList size={14} className="text-white" />
						</div>
						<span className="font-bold text-gray-800 tracking-tight text-sm">
							SOP Manager
						</span>
					</div>
				</div>

				{/* Nav */}
				<nav className="flex-1 py-4 px-3 space-y-0.5">
					{navItems.map((item, i) => (
						<button
							key={i}
							className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${item.active ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"}`}
						>
							{item.icon}
							{item.label}
							{item.active && <ChevronRight size={14} className="ml-auto" />}
						</button>
					))}
				</nav>

				{/* User */}
				<div className="p-4 border-t border-gray-100">
					<div className="flex items-center gap-3">
						<div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
							{user.avatar}
						</div>
						<div className="min-w-0">
							<p className="text-xs font-semibold text-gray-800 truncate">
								{user.name}
							</p>
							<p className="text-xs text-gray-400 truncate">
								{roleLabel[role]}
							</p>
						</div>
						<button className="ml-auto text-gray-300 hover:text-gray-500 transition-colors">
							<LogOut size={15} />
						</button>
					</div>
				</div>
			</aside>

			{/* Main */}
			<div className="flex-1 flex flex-col min-w-0">
				{/* Topbar */}
				<header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
					<button
						onClick={() => setSidebarOpen(!sidebarOpen)}
						className="text-gray-400 hover:text-gray-700 transition-colors"
					>
						{sidebarOpen ? <X size={18} /> : <Menu size={18} />}
					</button>

					<div className="flex-1">
						<h2 className="text-sm font-semibold text-gray-800">Dashboard</h2>
						<p className="text-xs text-gray-400">
							Welcome back, {user.name.split(" ")[0]}
						</p>
					</div>

					{/* Role Switcher (demo) */}
					<div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg p-1">
						{(["admin", "employee", "client"] as Role[]).map((r) => (
							<button
								key={r}
								onClick={() => setRole(r)}
								className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${role === r ? "bg-white shadow-sm text-gray-800" : "text-gray-400 hover:text-gray-600"}`}
							>
								{r.charAt(0).toUpperCase() + r.slice(1)}
							</button>
						))}
					</div>

					<button className="relative text-gray-400 hover:text-gray-700 transition-colors">
						<Bell size={18} />
						<span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
							3
						</span>
					</button>
				</header>

				{/* Content */}
				<main className="flex-1 p-6 space-y-6 overflow-auto">
					{/* Role badge */}
					<div className="flex items-center gap-3">
						<span
							className={`text-xs px-3 py-1 rounded-full font-semibold ${roleColor[role]}`}
						>
							{roleLabel[role]} View
						</span>
						<span className="text-xs text-gray-400">
							SOP Workflow Management
						</span>
					</div>

					{/* KPI Cards */}
					<div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
						{kpis.map((kpi, i) => (
							<div
								key={i}
								className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow"
							>
								<div className="flex items-center justify-between mb-3">
									<span className="text-xs text-gray-400 font-medium">
										{kpi.label}
									</span>
									<div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
										{kpi.icon}
									</div>
								</div>
								<p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
								<p
									className={`text-xs mt-1 flex items-center gap-1 ${kpi.positive ? "text-green-600" : "text-red-500"}`}
								>
									<TrendingUp size={11} />
									{kpi.change}
								</p>
							</div>
						))}
					</div>

					{/* Charts Row */}
					<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
						{/* Bar Chart */}
						<div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
							<div className="flex items-center justify-between mb-4">
								<div>
									<h3 className="text-sm font-semibold text-gray-800">
										{role === "admin"
											? "SOPs Published"
											: role === "employee"
												? "Tasks Completed"
												: "Documents Reviewed"}
									</h3>
									<p className="text-xs text-gray-400">Last 7 periods</p>
								</div>
							</div>
							<BarChart role={role} />
						</div>

						{/* Donut Chart */}
						<div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
							<div className="mb-4">
								<h3 className="text-sm font-semibold text-gray-800">
									SOP Status
								</h3>
								<p className="text-xs text-gray-400">Current breakdown</p>
							</div>
							<DonutChart role={role} />
						</div>
					</div>

					{/* Activity Table */}
					<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
						<div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
							<div>
								<h3 className="text-sm font-semibold text-gray-800">
									Recent Activity
								</h3>
								<p className="text-xs text-gray-400">Latest workflow updates</p>
							</div>
							<button className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors">
								View all
							</button>
						</div>
						<div className="overflow-x-auto">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-gray-50">
										<th className="text-left text-xs text-gray-400 font-medium px-5 py-3">
											User
										</th>
										<th className="text-left text-xs text-gray-400 font-medium px-5 py-3">
											Action
										</th>
										<th className="text-left text-xs text-gray-400 font-medium px-5 py-3">
											SOP / Document
										</th>
										<th className="text-left text-xs text-gray-400 font-medium px-5 py-3">
											Status
										</th>
										<th className="text-left text-xs text-gray-400 font-medium px-5 py-3">
											Time
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-gray-50">
									{activity.map((row, i) => (
										<tr key={i} className="hover:bg-gray-50 transition-colors">
											<td className="px-5 py-3.5">
												<div className="flex items-center gap-2">
													<div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
														{row.user
															.split(" ")
															.map((w) => w[0])
															.join("")
															.slice(0, 2)
															.toUpperCase()}
													</div>
													<span className="text-xs font-medium text-gray-700">
														{row.user}
													</span>
												</div>
											</td>
											<td className="px-5 py-3.5 text-xs text-gray-500">
												{row.action}
											</td>
											<td className="px-5 py-3.5 text-xs text-gray-700 font-medium">
												{row.target}
											</td>
											<td className="px-5 py-3.5">
												<StatusBadge status={row.status} />
											</td>
											<td className="px-5 py-3.5 text-xs text-gray-400">
												{row.time}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				</main>
			</div>
		</div>
	);
}
