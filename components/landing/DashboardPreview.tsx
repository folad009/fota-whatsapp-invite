export function DashboardPreview() {
  return (
    <section className="reveal-on-scroll border-b border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Your command center
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            A real-time dashboard for every event — stats, invitees, and actions
            in one view.
          </p>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="border-b border-border bg-muted/40 px-4 py-3 sm:px-6">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-destructive/70" />
              <span className="h-3 w-3 rounded-full bg-primary/40" />
              <span className="h-3 w-3 rounded-full bg-primary" />
              <span className="ml-3 text-sm font-medium text-muted-foreground">
                Event dashboard preview
              </span>
            </div>
          </div>

          <div className="grid gap-4 p-4 sm:grid-cols-5 sm:p-6">
            {[
              { label: "Invited", value: "128" },
              { label: "Delivered", value: "121" },
              { label: "Registered", value: "86" },
              { label: "Confirmed", value: "64" },
              { label: "Declined", value: "9" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-background p-4"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {stat.label}
                </p>
                <p className="mt-2 text-2xl font-bold">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-border p-4 sm:p-6">
            <div className="space-y-3">
              {[
                { name: "Ada O.", status: "Registered" },
                { name: "Chidi N.", status: "Confirmed" },
                { name: "Funke A.", status: "Delivered" },
              ].map((row) => (
                <div
                  key={row.name}
                  className="flex items-center justify-between rounded-lg border border-border/80 px-4 py-3 text-sm"
                >
                  <span className="font-medium">{row.name}</span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {row.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
