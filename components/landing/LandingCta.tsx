import Link from "next/link";
import { Button } from "@/components/ui/button";

export function LandingCta() {
  return (
    <section className="reveal-on-scroll bg-primary py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
          Ready to invite your next event?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-primary-foreground/85">
          Sign in to create events, send WhatsApp invites, and track RSVPs from
          one dashboard.
        </p>
        <div className="mt-8">
          <Link href="/sign-in">
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-primary-foreground/30 bg-primary-foreground px-8 text-base text-primary hover:bg-primary-foreground/90"
            >
              Sign in
            </Button>
          </Link>
        </div>
        <p className="mt-6 text-sm text-primary-foreground/75">
          Need access? Contact your administrator.
        </p>
      </div>
    </section>
  );
}
