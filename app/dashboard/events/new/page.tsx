import { EventForm } from "@/components/EventForm";
import { DashboardShell } from "@/components/DashboardShell";

export default function NewEventPage() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-2xl">
        <EventForm />
      </div>
    </DashboardShell>
  );
}
