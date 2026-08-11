"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { EventRecord } from "@/lib/types";
import { DashboardShell } from "@/components/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatShortDate } from "@/lib/utils";

export default function DashboardPage() {
  const events = useQuery(api.events.list);

  return (
    <DashboardShell>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your events</h1>
          <p className="text-muted-foreground">
            Manage invites and track RSVPs
          </p>
        </div>
        <Link href="/dashboard/events/new">
          <Button>New event</Button>
        </Link>
      </div>

      {events === undefined ? (
        <p className="text-muted-foreground">Loading events...</p>
      ) : events.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No events yet</CardTitle>
            <CardDescription>
              Create your first event to start sending WhatsApp invites.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/events/new">
              <Button>Create event</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(events as EventRecord[]).map((event) => (
            <Link key={event._id} href={`/dashboard/events/${event._id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                    <Badge status={event.status} />
                  </div>
                  <CardDescription>
                    {formatShortDate(event.date)} · {event.location}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}
