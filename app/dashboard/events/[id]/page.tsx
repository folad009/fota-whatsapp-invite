"use client";

import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardShell } from "@/components/DashboardShell";
import { EventForm } from "@/components/EventForm";
import { InviteUpload } from "@/components/InviteUpload";
import { InviteeTable } from "@/components/InviteeTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EventRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as Id<"events">;
  const [editing, setEditing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const event = useQuery(api.events.get, { eventId }) as EventRecord | undefined;
  const stats = useQuery(api.events.getStats, { eventId });
  const invitees = useQuery(api.invites.listByEvent, { eventId });

  const sendInvites = useMutation(api.invites.sendInvites);
  const resendFailed = useMutation(api.invites.resendFailed);
  const sendReminders = useMutation(api.invites.sendReminders);
  const updateEvent = useMutation(api.events.update);

  const runAction = async (
    key: string,
    fn: () => Promise<{ queued: number }>
  ) => {
    setActionLoading(key);
    setMessage("");
    try {
      const result = await fn();
      setMessage(`Queued ${result.queued} message(s)`);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  if (event === undefined) {
    return (
      <DashboardShell>
        <p className="text-muted-foreground">Loading event...</p>
      </DashboardShell>
    );
  }

  if (editing) {
    return (
      <DashboardShell>
        <div className="mx-auto max-w-2xl">
          <EventForm
            eventId={eventId}
            initial={{
              title: event.title,
              description: event.description,
              date: event.date,
              location: event.location,
              imageUrl: event.imageUrl,
              cloudinaryPublicId: event.cloudinaryPublicId,
              capacity: event.capacity,
              customFields: event.customFields,
            }}
          />
          <Button
            variant="ghost"
            className="mt-4"
            onClick={() => setEditing(false)}
          >
            Cancel editing
          </Button>
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Back to events
        </Link>
      </div>

      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          {event.imageUrl && (
            <div className="relative h-20 w-32 shrink-0 overflow-hidden rounded-lg">
              <Image
                src={event.imageUrl}
                alt={event.title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{event.title}</h1>
              <Badge status={event.status} />
            </div>
            <p className="mt-1 text-muted-foreground">
              {formatDate(event.date)}
            </p>
            <p className="text-sm text-muted-foreground">{event.location}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            Edit
          </Button>
          {event.status === "draft" && (
            <Button
              onClick={() =>
                updateEvent({ eventId, status: "published" })
              }
            >
              Publish
            </Button>
          )}
          {event.status === "published" && (
            <Button
              variant="outline"
              onClick={() =>
                updateEvent({ eventId, status: "completed" })
              }
            >
              Mark completed
            </Button>
          )}
        </div>
      </div>

      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {[
            { label: "Invited", value: stats.invited },
            { label: "Delivered", value: stats.delivered },
            { label: "Registered", value: stats.registered },
            { label: "Confirmed", value: stats.confirmed },
            { label: "Declined", value: stats.declined },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-8 flex flex-wrap gap-2">
        <Button
          disabled={!!actionLoading}
          onClick={() =>
            runAction("send", () => sendInvites({ eventId }))
          }
        >
          {actionLoading === "send" ? "Sending..." : "Send invites"}
        </Button>
        <Button
          variant="outline"
          disabled={!!actionLoading}
          onClick={() =>
            runAction("resend", () => resendFailed({ eventId }))
          }
        >
          {actionLoading === "resend" ? "Resending..." : "Resend failed"}
        </Button>
        <Button
          variant="outline"
          disabled={!!actionLoading}
          onClick={() =>
            runAction("remind", () => sendReminders({ eventId }))
          }
        >
          {actionLoading === "remind" ? "Sending..." : "Send reminders"}
        </Button>
      </div>

      {message && (
        <p className="mb-4 text-sm text-primary">{message}</p>
      )}

      <div className="space-y-8">
        <InviteUpload eventId={eventId} />
        {invitees && <InviteeTable eventId={eventId} invitees={invitees} />}
      </div>
    </DashboardShell>
  );
}
