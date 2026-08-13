import {
  BarChart3,
  BellRing,
  Link2,
  Send,
  Users,
} from "lucide-react";

const FEATURES = [
  {
    icon: Send,
    title: "Send invites",
    description:
      "Deliver WhatsApp messages with event banner images using approved Twilio templates.",
  },
  {
    icon: Link2,
    title: "Collect RSVPs",
    description:
      "Every invite links to a public registration page at /r/[token] for your guests.",
  },
  {
    icon: BellRing,
    title: "Confirm attendance",
    description:
      "Automated reminders with YES/NO reply handling so you know who is coming.",
  },
  {
    icon: Users,
    title: "Manage invitees",
    description:
      "Paste or upload CSV, copy registration links, and resend failed deliveries.",
  },
  {
    icon: BarChart3,
    title: "Live dashboard",
    description:
      "Track invited, delivered, registered, and confirmed counts — export to CSV anytime.",
  },
] as const;

export function FeatureGrid() {
  return (
    <section
      id="features"
      className="reveal-on-scroll border-b border-border bg-background py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to run an event
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From the first invite to the final headcount — built for organizers
            who work on WhatsApp every day.
          </p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => {
            const Icon = feature.icon;
            return (
              <article
                key={feature.title}
                className="rounded-2xl border border-border bg-card p-6 transition hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
