"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const { signOut } = useAuthActions();
  const router = useRouter();
  const pathname = usePathname();
  const me = useQuery(api.users.getMe, isAuthenticated ? {} : "skip");

  const navItems = useMemo(() => {
    const items: Array<{
      href: string;
      label: string;
      match: (path: string) => boolean;
    }> = [
      {
        href: "/dashboard",
        label: "Events",
        match: (path: string) => path === "/dashboard",
      },
      {
        href: "/dashboard/events/new",
        label: "New event",
        match: (path: string) => path === "/dashboard/events/new",
      },
    ];

    if (me?.role === "admin") {
      items.push({
        href: "/dashboard/users",
        label: "Users",
        match: (path: string) => path.startsWith("/dashboard/users"),
      });
    }

    return items;
  }, [me?.role]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/sign-in");
    }
  }, [isLoading, isAuthenticated, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
    router.refresh();
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
            <Link href="/dashboard" className="text-lg font-semibold text-primary">
              WhatsApp Invites
            </Link>
            <nav className="flex flex-wrap gap-1">
              {navItems.map((item) => {
                const isActive =
                  item.match(pathname) ||
                  (item.href === "/dashboard" &&
                    pathname.startsWith("/dashboard/events/") &&
                    pathname !== "/dashboard/events/new");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Button variant="ghost" onClick={() => void handleSignOut()}>
            Sign out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
