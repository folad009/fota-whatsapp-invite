"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { RegistrationForm } from "@/components/RegistrationForm";

export default function PublicEventRegisterPage() {
  const params = useParams();
  const eventId = params.eventId as Id<"events">;
  const event = useQuery(api.registrations.getPublicEvent, { eventId });

  if (event === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (event === null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Registration not available</h1>
          <p className="mt-2 text-muted-foreground">
            This event may be unpublished, closed, or public registration is
            not enabled.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <RegistrationForm mode="public" eventId={eventId} event={event} />
    </div>
  );
}
