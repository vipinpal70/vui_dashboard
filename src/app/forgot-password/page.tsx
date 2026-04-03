"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";

const ForgotPassword = () => {
	const [email, setEmail] = useState("");
	const [submitted, setSubmitted] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		console.log("Forgot password:", { email });
		const res = await fetch("/api/forgot-password", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ email }),
		});
		const data = await res.json();
		console.log(data);
		setSubmitted(true);
	};

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm space-y-6">
				{!submitted ? (
					<>
						<div className="space-y-2 text-center">
							<h1 className="text-2xl font-semibold tracking-tight text-foreground">
								Forgot password?
							</h1>
							<p className="text-sm text-muted-foreground">
								Enter your email and we'll send you a reset link
							</p>
						</div>

						<form onSubmit={handleSubmit} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="email">Email</Label>
								<Input
									id="email"
									type="email"
									placeholder="john@example.com"
									value={email}
									onChange={(e) => setEmail(e.target.value)}
									required
								/>
							</div>

							<Button type="submit" className="w-full cursor-pointer">
								Send reset link
							</Button>
						</form>
					</>
				) : (
					<div className="space-y-2 text-center">
						<div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="h-6 w-6 text-primary"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								strokeWidth={2}
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
								/>
							</svg>
						</div>
						<h1 className="text-2xl font-semibold tracking-tight text-foreground">
							Check your email
						</h1>
						<p className="text-sm text-muted-foreground">
							We sent a password reset link to{" "}
							<span className="font-medium text-foreground">{email}</span>
						</p>
						<p className="text-xs text-muted-foreground pt-1">
							Didn't receive it?{" "}
							<button
								type="button"
								onClick={() => setSubmitted(false)}
								className="text-primary underline-offset-4 hover:underline"
							>
								Try again
							</button>
						</p>
					</div>
				)}

				<div className="text-center text-sm text-muted-foreground">
					<Link
						href="/signin"
						className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
					>
						<ArrowLeft size={14} />
						Back to sign in
					</Link>
				</div>
			</div>
		</div>
	);
};

export default ForgotPassword;
