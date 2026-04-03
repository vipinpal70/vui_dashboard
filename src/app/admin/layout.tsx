"use client";

import { useState, useEffect } from "react";
import { Sidebar, SidebarToggle } from "@/components/Sidebar";
import { Bell } from "lucide-react";

export default function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const [collapsed, setCollapsed] = useState(false);
	const [user, setUser] = useState<{
		name: string;
		email: string;
		avatar: string;
	} | null>(null);

	useEffect(() => {
		async function fetchUser() {
			try {
				const res = await fetch("/api/me");
				if (res.ok) {
					const data = await res.json();
					if (data.user) {
						setUser({
							name: data.user.username,
							email: data.user.email,
							avatar: data.user.username.charAt(0).toUpperCase(),
						});
					}
				}
			} catch (error) {
				console.error("Failed to fetch user:", error);
			}
		}
		fetchUser();
	}, []);

	return (
		<div className="flex h-screen bg-gray-50 overflow-hidden">
			<Sidebar
				role="admin"
				user={
					user || {
						name: "Loading...",
						email: "...",
						avatar: "?",
					}
				}
				collapsed={collapsed}
				onCollapse={setCollapsed}
				onLogout={async () => {
					await fetch("/api/sign-out", {
						method: "POST",
						credentials: "include",
					});
					window.location.href = "/signin";
				}}
			/>
			<div className="flex-1 flex flex-col min-w-0 overflow-hidden">
				<header className="h-16 bg-white border-b border-gray-100 flex items-center px-6 gap-4 shrink-0">
					<SidebarToggle
						collapsed={collapsed}
						onToggle={() => setCollapsed((p) => !p)}
					/>
					<div className="flex-1" />
					<button className="relative text-gray-400 hover:text-gray-700 transition-colors">
						<Bell size={18} />
						<span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-white text-[9px] flex items-center justify-center font-bold">
							3
						</span>
					</button>
				</header>
				<main className="flex-1 overflow-auto">{children}</main>
			</div>
		</div>
	);
}
