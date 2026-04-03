// src/app/admin/dashboard/page.tsx
"use client";
import { useState, useEffect } from "react";
import {
	TrendingUp,
	TrendingDown,
	Users,
	FileText,
	Clock,
	CheckCircle2,
	AlertCircle,
	Building2,
	UserCheck,
	MoreHorizontal,
	Eye,
	ArrowUpRight,
	UsersRound,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────
interface KpiCard {
	label: string;
	value: string;
	change: string;
	positive: boolean;
	icon: React.ReactNode;
	color: string;
	bg: string;
}

interface ActivityItem {
	id: string;
	user: string;
	action: string;
	target: string;
	time: string;
	status: "completed" | "pending" | "overdue";
}

interface BarData {
	label: string;
	value: number;
}
interface DonutSlice {
	label: string;
	value: number;
	color: string;
}

// ─── Static mock data (replace with API calls) ────────────────
const KPI_DATA: KpiCard[] = [
	{
		label: "Total Members",
		value: "124",
		change: "+4 this month",
		positive: true,
		icon: <Users size={18} />,
		color: "text-blue-600",
		bg: "bg-blue-50",
	},
	{
		label: "Active Members",
		value: "117",
		change: "94% active rate",
		positive: true,
		icon: <UserCheck size={18} />,
		color: "text-emerald-600",
		bg: "bg-emerald-50",
	},
	{
		label: "SOPs Published",
		value: "215",
		change: "+12 this month",
		positive: true,
		icon: <FileText size={18} />,
		color: "text-violet-600",
		bg: "bg-violet-50",
	},
	{
		label: "Pending Reviews",
		value: "7",
		change: "-3 from last week",
		positive: true,
		icon: <Clock size={18} />,
		color: "text-amber-600",
		bg: "bg-amber-50",
	},
	{
		label: "Active Clients",
		value: "38",
		change: "+2 this week",
		positive: true,
		icon: <Building2 size={18} />,
		color: "text-teal-600",
		bg: "bg-teal-50",
	},
	{
		label: "Total Teams",
		value: "6",
		change: "+1 this month",
		positive: true,
		icon: <UsersRound size={18} />,
		color: "text-pink-600",
		bg: "bg-pink-50",
	},
	{
		label: "Overdue SOPs",
		value: "3",
		change: "Needs attention",
		positive: false,
		icon: <AlertCircle size={18} />,
		color: "text-red-500",
		bg: "bg-red-50",
	},
	{
		label: "Completed Today",
		value: "18",
		change: "+6 from yesterday",
		positive: true,
		icon: <CheckCircle2 size={18} />,
		color: "text-indigo-600",
		bg: "bg-indigo-50",
	},
];

const ACTIVITY: ActivityItem[] = [
	{
		id: "1",
		user: "James Cole",
		action: "Submitted",
		target: "Onboarding SOP v3",
		time: "2 min ago",
		status: "pending",
	},
	{
		id: "2",
		user: "Priya Nair",
		action: "Completed",
		target: "Safety Protocol #12",
		time: "18 min ago",
		status: "completed",
	},
	{
		id: "3",
		user: "Tom Harris",
		action: "Overdue",
		target: "Client Handoff SOP",
		time: "1 hr ago",
		status: "overdue",
	},
	{
		id: "4",
		user: "Liu Wei",
		action: "Published",
		target: "IT Setup Checklist",
		time: "3 hr ago",
		status: "completed",
	},
	{
		id: "5",
		user: "Ana Souza",
		action: "Requested review",
		target: "HR Policy Update",
		time: "5 hr ago",
		status: "pending",
	},
	{
		id: "6",
		user: "Kyle Brooks",
		action: "Completed",
		target: "Client Onboarding Flow",
		time: "Yesterday",
		status: "completed",
	},
];

const BAR_DATA: BarData[] = [
	{ label: "Jan", value: 65 },
	{ label: "Feb", value: 78 },
	{ label: "Mar", value: 90 },
	{ label: "Apr", value: 81 },
	{ label: "May", value: 56 },
	{ label: "Jun", value: 95 },
	{ label: "Jul", value: 110 },
];

const DONUT_DATA: DonutSlice[] = [
	{ label: "Completed", value: 68, color: "#22c55e" },
	{ label: "In Progress", value: 20, color: "#3b82f6" },
	{ label: "Pending", value: 12, color: "#f59e0b" },
];

// ─── Status Badge ─────────────────────────────────────────────
const StatusBadge = ({ status }: { status: ActivityItem["status"] }) => {
	const styles = {
		completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
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

// ─── Bar Chart ────────────────────────────────────────────────
const BarChart = ({ data }: { data: BarData[] }) => {
	const max = Math.max(...data.map((d) => d.value));
	return (
		<div className="flex items-end gap-2 h-36 w-full">
			{data.map((bar, i) => (
				<div key={i} className="flex flex-col items-center gap-1 flex-1">
					<span className="text-[10px] text-gray-400 font-medium">
						{bar.value}
					</span>
					<div
						className="w-full rounded-t-md transition-all duration-500 hover:opacity-80"
						style={{
							height: `${(bar.value / max) * 100}px`,
							background:
								i === data.length - 1
									? "linear-gradient(180deg, #6366f1, #3b82f6)"
									: "linear-gradient(180deg, #93c5fd, #bfdbfe)",
						}}
					/>
					<span className="text-xs text-gray-400">{bar.label}</span>
				</div>
			))}
		</div>
	);
};

// ─── Donut Chart ──────────────────────────────────────────────
const DonutChart = ({ data }: { data: DonutSlice[] }) => {
	const total = data.reduce((s, d) => s + d.value, 0);
	const radius = 40;
	const cx = 60;
	const cy = 60;
	const circumference = 2 * Math.PI * radius;
	let cumulative = 0;

	return (
		<div className="flex items-center gap-5">
			<svg width="120" height="120" viewBox="0 0 120 120" className="shrink-0">
				{data.map((seg, i) => {
					const dash = circumference * (seg.value / total);
					const offset = circumference * (1 - cumulative / total);
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
					y={cy - 4}
					textAnchor="middle"
					fontSize="13"
					fontWeight="bold"
					fill="#1e293b"
				>
					{total}%
				</text>
				<text
					x={cx}
					y={cy + 10}
					textAnchor="middle"
					fontSize="8"
					fill="#94a3b8"
				>
					complete
				</text>
			</svg>
			<div className="space-y-2 flex-1">
				{data.map((seg, i) => (
					<div key={i} className="flex items-center gap-2">
						<div
							className="w-2.5 h-2.5 rounded-full shrink-0"
							style={{ backgroundColor: seg.color }}
						/>
						<span className="text-xs text-gray-500 flex-1">{seg.label}</span>
						<span className="text-xs font-semibold text-gray-700">
							{seg.value}%
						</span>
					</div>
				))}
			</div>
		</div>
	);
};

// ─── Greeting ─────────────────────────────────────────────────
const getGreeting = () => {
	const h = new Date().getHours();
	if (h < 12) return "Good morning";
	if (h < 17) return "Good afternoon";
	return "Good evening";
};

const getInitials = (name: string) =>
	name
		.split(" ")
		.map((w) => w[0])
		.join("")
		.slice(0, 2)
		.toUpperCase();

// ─── Main Page ────────────────────────────────────────────────
export default function AdminDashboard() {
	const [user, setUser] = useState<{ username: string; email: string } | null>(
		null,
	);
	const [menuOpen, setMenuOpen] = useState<string | null>(null);

	useEffect(() => {
		// Fetch current user info from session/cookie
		fetch("/api/me", { credentials: "include" })
			.then((r: any) => r.json())
			.then((d: any) => setUser(d.user ?? null))
			.catch(() => null);
	}, []);

	const today = new Date().toLocaleDateString("en-US", {
		weekday: "long",
		month: "long",
		day: "numeric",
		year: "numeric",
	});

	return (
		<div className="min-h-screen bg-gray-50 p-6 space-y-6">
			{/* ── Welcome Banner ── */}
			<div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 flex items-center justify-between">
				<div className="flex items-center gap-4">
					<div className="w-11 h-11 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
						{user ? getInitials(user.username) : "A"}
					</div>
					<div>
						<h1 className="text-base font-semibold text-gray-800">
							{getGreeting()}, {user?.username ?? "Admin"} 👋
						</h1>
						<p className="text-xs text-gray-400 mt-0.5">{today}</p>
					</div>
				</div>
				<div className="hidden sm:flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-200 px-3 py-2 rounded-xl">
					<div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
					System operational
				</div>
			</div>

			{/* ── KPI Cards ── */}
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
				{KPI_DATA.map((kpi, i) => (
					<div
						key={i}
						className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow"
					>
						<div className="flex items-center justify-between mb-3">
							<span className="text-xs text-gray-400 font-medium">
								{kpi.label}
							</span>
							<div
								className={`w-8 h-8 rounded-lg ${kpi.bg} ${kpi.color} flex items-center justify-center`}
							>
								{kpi.icon}
							</div>
						</div>
						<p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
						<p
							className={`text-xs mt-1 flex items-center gap-1 ${kpi.positive ? "text-emerald-600" : "text-red-500"}`}
						>
							{kpi.positive ? (
								<TrendingUp size={11} />
							) : (
								<TrendingDown size={11} />
							)}
							{kpi.change}
						</p>
					</div>
				))}
			</div>

			{/* ── Charts Row ── */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				{/* Bar Chart */}
				<div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
					<div className="flex items-center justify-between mb-5">
						<div>
							<h3 className="text-sm font-semibold text-gray-800">
								SOPs Published
							</h3>
							<p className="text-xs text-gray-400">Monthly output this year</p>
						</div>
						<span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
							+18% vs last year
						</span>
					</div>
					<BarChart data={BAR_DATA} />
				</div>

				{/* Donut Chart */}
				<div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
					<div className="mb-5">
						<h3 className="text-sm font-semibold text-gray-800">SOP Status</h3>
						<p className="text-xs text-gray-400">Current breakdown</p>
					</div>
					<DonutChart data={DONUT_DATA} />
				</div>
			</div>

			{/* ── Quick Stats Row ── */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				{[
					{
						label: "Completion Rate",
						value: "87%",
						sub: "vs 82% last month",
						positive: true,
						bar: 87,
						color: "bg-emerald-500",
					},
					{
						label: "Avg. Review Time",
						value: "1.4 days",
						sub: "vs 2.1 days last month",
						positive: true,
						bar: 66,
						color: "bg-blue-500",
					},
					{
						label: "Overdue Rate",
						value: "3.2%",
						sub: "vs 5.1% last month",
						positive: true,
						bar: 32,
						color: "bg-amber-500",
					},
				].map((stat, i) => (
					<div
						key={i}
						className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
					>
						<div className="flex items-center justify-between mb-2">
							<p className="text-xs text-gray-400 font-medium">{stat.label}</p>
							<p
								className={`text-xs font-medium flex items-center gap-0.5 ${stat.positive ? "text-emerald-600" : "text-red-500"}`}
							>
								{stat.positive ? (
									<TrendingUp size={11} />
								) : (
									<TrendingDown size={11} />
								)}
								{stat.sub}
							</p>
						</div>
						<p className="text-2xl font-bold text-gray-800 mb-3">
							{stat.value}
						</p>
						<div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
							<div
								className={`h-full ${stat.color} rounded-full`}
								style={{ width: `${stat.bar}%` }}
							/>
						</div>
					</div>
				))}
			</div>

			{/* ── Recent Activity Table ── */}
			<div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
				<div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
					<div>
						<h3 className="text-sm font-semibold text-gray-800">
							Recent Activity
						</h3>
						<p className="text-xs text-gray-400">
							Latest workflow updates across all teams
						</p>
					</div>
					<button className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors">
						View all <ArrowUpRight size={12} />
					</button>
				</div>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="bg-gray-50 border-b border-gray-100">
								{[
									"Member",
									"Action",
									"SOP / Document",
									"Status",
									"Time",
									"",
								].map((h) => (
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
							{ACTIVITY.map((row) => (
								<tr key={row.id} className="hover:bg-gray-50 transition-colors">
									<td className="px-5 py-3.5">
										<div className="flex items-center gap-2.5">
											<div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0">
												{getInitials(row.user)}
											</div>
											<span className="text-xs font-medium text-gray-700 whitespace-nowrap">
												{row.user}
											</span>
										</div>
									</td>
									<td className="px-5 py-3.5 text-xs text-gray-500">
										{row.action}
									</td>
									<td className="px-5 py-3.5 text-xs text-gray-700 font-medium max-w-[180px] truncate">
										{row.target}
									</td>
									<td className="px-5 py-3.5">
										<StatusBadge status={row.status} />
									</td>
									<td className="px-5 py-3.5 text-xs text-gray-400 whitespace-nowrap">
										{row.time}
									</td>
									<td className="px-5 py-3.5 relative">
										<button
											onClick={() =>
												setMenuOpen(menuOpen === row.id ? null : row.id)
											}
											className="text-gray-300 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
										>
											<MoreHorizontal size={15} />
										</button>
										{menuOpen === row.id && (
											<>
												<div
													className="fixed inset-0 z-10"
													onClick={() => setMenuOpen(null)}
												/>
												<div className="absolute right-4 top-10 z-20 bg-white border border-gray-100 rounded-xl shadow-lg w-36 py-1">
													<button className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50">
														<Eye size={12} /> View SOP
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
			</div>
		</div>
	);
}
