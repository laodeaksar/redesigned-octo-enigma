// =============================================================================
// Header — top bar with page title + breadcrumbs
// =============================================================================

import { useAuth } from "@/stores/auth.store";
import { Bell, Search } from "lucide-react";

interface HeaderProps {
	subtitle?: string | undefined;
	title: string;
}

export function Header({ title, subtitle }: HeaderProps) {
	const { user } = useAuth();

	return (
		<header className="border-border bg-background flex h-16 items-center justify-between border-b px-6">
			{/* Title */}
			<div>
				<h1 className="text-foreground text-lg font-semibold leading-none">
					{title}
				</h1>
				{subtitle && (
					<p className="text-muted-foreground mt-0.5 text-sm">{subtitle}</p>
				)}
			</div>

			{/* Actions */}
			<div className="flex items-center gap-3">
				{/* Search */}
				<div className="relative hidden sm:block">
					<Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
					<input
						className="border-input placeholder:text-muted-foreground focus:ring-ring h-9 w-56 rounded-md border bg-transparent pl-9 pr-3 text-sm focus:outline-none focus:ring-2"
						placeholder="Cari..."
						type="search"
					/>
				</div>

				{/* Notifications */}
				<button className="border-input text-muted-foreground hover:bg-accent hover:text-foreground relative flex h-9 w-9 items-center justify-center rounded-md border">
					<Bell className="h-4 w-4" />
					<span className="bg-destructive absolute right-1.5 top-1.5 h-2 w-2 rounded-full" />
				</button>

				{/* Avatar */}
				<div className="bg-primary/10 text-primary flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold">
					{user?.name.charAt(0).toUpperCase()}
				</div>
			</div>
		</header>
	);
}
