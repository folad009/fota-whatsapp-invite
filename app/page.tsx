import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <span className="text-lg font-semibold text-primary">
            WhatsApp Invites
          </span>
          <div className="flex gap-2">
            <Link href="/sign-in">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/sign-up">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-5xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Send event invites on WhatsApp
        </h1>
        <p className="mt-4 max-w-xl text-lg text-muted-foreground">
          Create events, send beautiful image invites, collect registrations, and
          confirm attendance — all through WhatsApp.
        </p>
        <div className="mt-8 flex gap-4">
          <Link href="/sign-up">
            <Button size="lg">Create your first event</Button>
          </Link>
          <Link href="/sign-in">
            <Button size="lg" variant="outline">
              Sign in
            </Button>
          </Link>
        </div>

        <div className="mt-16 grid w-full max-w-3xl gap-6 sm:grid-cols-3">
          {[
            {
              title: "Send invites",
              desc: "WhatsApp messages with event banner images",
            },
            {
              title: "Collect RSVPs",
              desc: "Registration page linked from every invite",
            },
            {
              title: "Confirm attendance",
              desc: "Automated reminders with YES/NO replies",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-border p-6 text-left"
            >
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
