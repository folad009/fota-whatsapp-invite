const STEPS = [
  {
    step: "01",
    title: "Create your event",
    description: "Add details, location, and upload a banner image via Cloudinary.",
  },
  {
    step: "02",
    title: "Add invitees & send",
    description:
      "Paste phone numbers or upload a CSV, then send WhatsApp invites in one click.",
  },
  {
    step: "03",
    title: "Guests register online",
    description:
      "Invitees open their personal link, register on the web, and get an RSVP confirmation.",
  },
  {
    step: "04",
    title: "Track & remind",
    description:
      "Monitor RSVPs on your dashboard, send reminders, and handle YES/NO replies automatically.",
  },
] as const;

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="reveal-on-scroll bg-secondary/40 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How it works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Four steps from event setup to confirmed attendance.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item) => (
            <li
              key={item.step}
              className="relative rounded-2xl border border-border bg-background p-6"
            >
              <span className="text-sm font-bold text-primary">{item.step}</span>
              <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
