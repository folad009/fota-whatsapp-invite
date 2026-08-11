"use client";

import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { InviteeRecord } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { copyToClipboard, exportToCsv, getRegistrationUrl } from "@/lib/utils";

export function InviteeTable({
  eventId,
  invitees,
}: {
  eventId: Id<"events">;
  invitees: InviteeRecord[];
}) {
  const resendOne = useMutation(api.invites.resendOne);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyAllStatus, setCopyAllStatus] = useState<"idle" | "copied" | "error">(
    "idle"
  );

  const filtered = useMemo(() => {
    return invitees.filter((inv) => {
      const matchesSearch =
        !search ||
        inv.phone.includes(search) ||
        inv.registrationName?.toLowerCase().includes(search.toLowerCase()) ||
        inv.inviteeName?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        inv.deliveryStatus === statusFilter ||
        inv.rsvpStatus === statusFilter ||
        inv.attendanceStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invitees, search, statusFilter]);

  const handleResend = async (inviteId: string) => {
    setLoadingId(inviteId);
    try {
      await resendOne({ inviteId: inviteId as Id<"invites"> });
    } finally {
      setLoadingId(null);
    }
  };

  const handleCopyLink = async (inviteId: string, token: string) => {
    const url = getRegistrationUrl(token);
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopiedId(inviteId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleCopyAllLinks = async () => {
    const lines = filtered.map((inv) => {
      const name = inv.registrationName ?? inv.inviteeName ?? inv.phone;
      return `${name}\t${inv.phone}\t${getRegistrationUrl(inv.token)}`;
    });
    const ok = await copyToClipboard(lines.join("\n"));
    setCopyAllStatus(ok ? "copied" : "error");
    setTimeout(() => setCopyAllStatus("idle"), 2000);
  };

  const handleExport = () => {
    exportToCsv(
      filtered.map((inv) => ({
        phone: inv.phone,
        name: inv.registrationName ?? inv.inviteeName ?? "",
        registrationUrl: getRegistrationUrl(inv.token),
        delivery: inv.deliveryStatus,
        rsvp: inv.rsvpStatus ?? "pending",
        attendance: inv.attendanceStatus ?? "unknown",
      })),
      `event-${eventId}-invitees.csv`
    );
  };

  if (invitees.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center text-muted-foreground">
        No invitees yet. Add phone numbers above to get started.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Search by phone or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="registered">Registered</option>
            <option value="confirmed">Confirmed</option>
            <option value="declined">Declined</option>
          </select>
          <Button variant="outline" onClick={handleCopyAllLinks}>
            {copyAllStatus === "copied"
              ? "Copied!"
              : copyAllStatus === "error"
                ? "Copy failed"
                : "Copy all links"}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Phone</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="min-w-[200px] px-4 py-3 text-left font-medium">
                Invite link
              </th>
              <th className="px-4 py-3 text-left font-medium">Delivery</th>
              <th className="px-4 py-3 text-left font-medium">RSVP</th>
              <th className="px-4 py-3 text-left font-medium">Attendance</th>
              <th className="px-4 py-3 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((inv) => {
              const url = getRegistrationUrl(inv.token);
              return (
                <tr
                  key={inv._id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-4 py-3 font-mono text-xs">{inv.phone}</td>
                  <td className="px-4 py-3">
                    {inv.registrationName ?? inv.inviteeName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="max-w-[180px] truncate font-mono text-xs text-muted-foreground"
                        title={url}
                      >
                        {url}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => handleCopyLink(inv._id, inv.token)}
                      >
                        {copiedId === inv._id ? "Copied!" : "Copy"}
                      </Button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={inv.deliveryStatus} />
                    {inv.failureReason && (
                      <p className="mt-1 text-xs text-destructive">
                        {inv.failureReason}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={inv.rsvpStatus ?? "pending"} />
                  </td>
                  <td className="px-4 py-3">
                    <Badge status={inv.attendanceStatus ?? "unknown"} />
                  </td>
                  <td className="px-4 py-3">
                    {(inv.deliveryStatus === "failed" ||
                      inv.deliveryStatus === "pending") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={loadingId === inv._id}
                        onClick={() => handleResend(inv._id)}
                      >
                        {loadingId === inv._id ? "..." : "Resend"}
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((inv) => {
          const url = getRegistrationUrl(inv.token);
          return (
            <div
              key={inv._id}
              className="rounded-xl border border-border p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium">
                    {inv.registrationName ?? inv.inviteeName ?? "—"}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {inv.phone}
                  </p>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  <Badge status={inv.deliveryStatus} />
                  <Badge status={inv.rsvpStatus ?? "pending"} />
                </div>
              </div>
              <div className="space-y-2">
                <p className="break-all font-mono text-xs text-muted-foreground">
                  {url}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleCopyLink(inv._id, inv.token)}
                  >
                    {copiedId === inv._id ? "Copied!" : "Copy link"}
                  </Button>
                  {(inv.deliveryStatus === "failed" ||
                    inv.deliveryStatus === "pending") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loadingId === inv._id}
                      onClick={() => handleResend(inv._id)}
                    >
                      {loadingId === inv._id ? "..." : "Resend"}
                    </Button>
                  )}
                </div>
              </div>
              {inv.failureReason && (
                <p className="text-xs text-destructive">{inv.failureReason}</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {invitees.length} invitees
      </p>
    </div>
  );
}
