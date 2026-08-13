import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-foreground"
        >
          WhatsApp Invites
        </Link>

        <nav className="flex items-center gap-3 sm:gap-8" aria-label="Main">
          <a
            href="#features"
            className="text-xs font-medium text-muted-foreground transition hover:text-foreground sm:text-sm"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-xs font-medium text-muted-foreground transition hover:text-foreground sm:text-sm"
          >
            How it works
          </a>
        </nav>

        <Link href="/sign-in">
          <Button size="sm" className="rounded-xl px-4">
            Sign in
          </Button>
        </Link>
      </div>
    </header>
  );
}
