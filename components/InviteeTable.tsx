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

const DELIVERED_STATUSES = ["sent", "delivered", "read"] as const;

function canResendDelivery(inv: InviteeRecord): boolean {
  return inv.deliveryStatus === "failed" || inv.deliveryStatus === "pending";
}

function canResendInviteReminder(inv: InviteeRecord): boolean {
  const delivered = DELIVERED_STATUSES.includes(
    inv.deliveryStatus as (typeof DELIVERED_STATUSES)[number]
  );
  const rsvpPending = !inv.rsvpStatus || inv.rsvpStatus === "pending";
  const attendanceUnknown =
    !inv.attendanceStatus || inv.attendanceStatus === "unknown";
  return delivered && rsvpPending && attendanceUnknown;
}

function canSendAttendanceReminder(inv: InviteeRecord): boolean {
  return (
    inv.rsvpStatus === "registered" &&
    (!inv.attendanceStatus || inv.attendanceStatus === "unknown") &&
    !!inv.registrationId
  );
}

function isRowSelectable(inv: InviteeRecord): boolean {
  return canSendAttendanceReminder(inv) || canResendInviteReminder(inv);
}

function InviteeResendActions({
  inv,
  loadingId,
  onResend,
  className,
}: {
  inv: InviteeRecord;
  loadingId: string | null;
  onResend: (inviteId: string) => void;
  className?: string;
}) {
  const showDelivery = canResendDelivery(inv);
  const showReminder = canResendInviteReminder(inv);
  if (!showDelivery && !showReminder) {
    return null;
  }

  const loading = loadingId === inv._id;

  return (
    <div className={className ?? "flex flex-wrap gap-1"}>
      {showDelivery && (
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => onResend(inv._id)}
        >
          {loading ? "..." : "Resend"}
        </Button>
      )}
      {showReminder && (
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={() => onResend(inv._id)}
        >
          {loading ? "..." : "Resend invite"}
        </Button>
      )}
    </div>
  );
}

export function InviteeTable({
  eventId,
  invitees,
}: {
  eventId: Id<"events">;
  invitees: InviteeRecord[];
}) {
  const resendOne = useMutation(api.invites.resendOne);
  const sendInvites = useMutation(api.invites.sendInvites);
  const sendReminders = useMutation(api.invites.sendReminders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState<"reminder" | "invite" | null>(
    null
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [actionMessage, setActionMessage] = useState("");
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

  const selectableFiltered = useMemo(
    () => filtered.filter(isRowSelectable),
    [filtered]
  );

  const selectedInvitees = useMemo(
    () => invitees.filter((inv) => selectedIds.has(inv._id)),
    [invitees, selectedIds]
  );

  const selectedReminderCount = useMemo(
    () => selectedInvitees.filter(canSendAttendanceReminder).length,
    [selectedInvitees]
  );

  const selectedInviteResendCount = useMemo(
    () => selectedInvitees.filter(canResendInviteReminder).length,
    [selectedInvitees]
  );

  const allSelectableSelected =
    selectableFiltered.length > 0 &&
    selectableFiltered.every((inv) => selectedIds.has(inv._id));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableFiltered.map((inv) => inv._id)));
  };

  const toggleSelect = (inviteId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(inviteId)) {
        next.delete(inviteId);
      } else {
        next.add(inviteId);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleResend = async (inviteId: string) => {
    setLoadingId(inviteId);
    setActionMessage("");
    try {
      await resendOne({ inviteId: inviteId as Id<"invites"> });
      setActionMessage("Queued 1 invite");
    } finally {
      setLoadingId(null);
    }
  };

  const handleSendRemindersToSelected = async () => {
    const registrationIds = selectedInvitees
      .filter(canSendAttendanceReminder)
      .map((inv) => inv.registrationId as Id<"registrations">);

    if (registrationIds.length === 0) return;

    setBulkLoading("reminder");
    setActionMessage("");
    try {
      const result = await sendReminders({ eventId, registrationIds });
      setActionMessage(`Queued ${result.queued} message(s)`);
      clearSelection();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBulkLoading(null);
    }
  };

  const handleResendInvitesToSelected = async () => {
    const inviteIds = selectedInvitees
      .filter(canResendInviteReminder)
      .map((inv) => inv._id as Id<"invites">);

    if (inviteIds.length === 0) return;

    setBulkLoading("invite");
    setActionMessage("");
    try {
      const result = await sendInvites({ eventId, inviteIds });
      setActionMessage(`Queued ${result.queued} message(s)`);
      clearSelection();
    } catch (err) {
      setActionMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBulkLoading(null);
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

      {(selectedReminderCount > 0 || selectedInviteResendCount > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          {selectedReminderCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={!!bulkLoading}
              onClick={handleSendRemindersToSelected}
            >
              {bulkLoading === "reminder"
                ? "Sending..."
                : `Send reminder to selected (${selectedReminderCount})`}
            </Button>
          )}
          {selectedInviteResendCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              disabled={!!bulkLoading}
              onClick={handleResendInvitesToSelected}
            >
              {bulkLoading === "invite"
                ? "Sending..."
                : `Resend invite to selected (${selectedInviteResendCount})`}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={clearSelection}>
            Clear selection
          </Button>
        </div>
      )}

      {actionMessage && (
        <p className="text-sm text-primary">{actionMessage}</p>
      )}

      {/* Desktop table */}
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="w-10 px-3 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-input"
                  checked={allSelectableSelected}
                  disabled={selectableFiltered.length === 0}
                  onChange={toggleSelectAll}
                  aria-label="Select all eligible invitees"
                />
              </th>
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
              const selectable = isRowSelectable(inv);
              return (
                <tr
                  key={inv._id}
                  className="border-b border-border last:border-0"
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input disabled:opacity-40"
                      checked={selectedIds.has(inv._id)}
                      disabled={!selectable || !!bulkLoading}
                      onChange={() => toggleSelect(inv._id)}
                      aria-label={`Select ${inv.phone}`}
                    />
                  </td>
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
                    <InviteeResendActions
                      inv={inv}
                      loadingId={loadingId}
                      onResend={handleResend}
                    />
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
          const selectable = isRowSelectable(inv);
          return (
            <div
              key={inv._id}
              className="rounded-xl border border-border p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 shrink-0 rounded border-input disabled:opacity-40"
                    checked={selectedIds.has(inv._id)}
                    disabled={!selectable || !!bulkLoading}
                    onChange={() => toggleSelect(inv._id)}
                    aria-label={`Select ${inv.phone}`}
                  />
                  <div>
                    <p className="font-medium">
                      {inv.registrationName ?? inv.inviteeName ?? "—"}
                    </p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {inv.phone}
                    </p>
                  </div>
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
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[7rem]"
                    onClick={() => handleCopyLink(inv._id, inv.token)}
                  >
                    {copiedId === inv._id ? "Copied!" : "Copy link"}
                  </Button>
                  <InviteeResendActions
                    inv={inv}
                    loadingId={loadingId}
                    onResend={handleResend}
                  />
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
