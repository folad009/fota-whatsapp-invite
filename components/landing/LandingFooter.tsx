import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6">
        <p className="text-sm text-muted-foreground">© WhatsApp Invites</p>
        <Link
          href="/sign-in"
          className="text-sm font-medium text-primary transition hover:opacity-80"
        >
          Sign in
        </Link>
      </div>
    </footer>
  );
}
