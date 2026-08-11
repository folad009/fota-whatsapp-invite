"use client";

import { useMutation } from "convex/react";
import { useMemo, useState } from "react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface RegistrationFormProps {
  token: string;
  inviteeName?: string;
  event: {
    title: string;
    description?: string;
    date: number;
    location: string;
    imageUrl?: string;
    customFields?: string[];
    capacity?: number;
    registrationDeadline?: number;
    registeredCount: number;
  };
  alreadyRegistered: boolean;
}

export function RegistrationForm({
  token,
  inviteeName,
  event,
  alreadyRegistered,
}: RegistrationFormProps) {
  const register = useMutation(api.registrations.register);
  const [name, setName] = useState(inviteeName ?? "");
  const [email, setEmail] = useState("");
  const [customResponses, setCustomResponses] = useState<
    Record<string, string>
  >({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const registrationStatus = useMemo(() => {
    const now = Date.now();
    if (event.registrationDeadline && now > event.registrationDeadline) {
      return {
        closed: true,
        message: `Registration closed on ${formatDate(event.registrationDeadline)}.`,
      };
    }
    if (
      event.capacity !== undefined &&
      event.registeredCount >= event.capacity
    ) {
      return {
        closed: true,
        message: "This event is at full capacity. No more spots available.",
      };
    }
    return { closed: false, message: "" };
  }, [event.capacity, event.registrationDeadline, event.registeredCount]);

  const spotsRemaining =
    event.capacity !== undefined
      ? Math.max(0, event.capacity - event.registeredCount)
      : undefined;

  if (alreadyRegistered || success) {
    return (
      <Card className="mx-auto w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-primary">You&apos;re registered!</CardTitle>
          <CardDescription>
            Thanks for registering for {event.title}. You&apos;ll receive a
            WhatsApp confirmation shortly.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (registrationStatus.closed) return;

    setLoading(true);
    setError("");

    try {
      await register({
        token,
        name,
        email: email || undefined,
        customResponses:
          Object.keys(customResponses).length > 0 ? customResponses : undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-4 sm:space-y-6">
      {event.imageUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl sm:rounded-2xl">
          <Image
            src={event.imageUrl}
            alt={event.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 768px) 100vw, 512px"
          />
        </div>
      )}

      <Card className="border-border shadow-sm">
        <CardHeader className="space-y-3 pb-4">
          <CardTitle className="text-xl sm:text-2xl">{event.title}</CardTitle>
          <CardDescription className="space-y-1 text-sm sm:text-base">
            <span className="block">{formatDate(event.date)}</span>
            <span className="block">{event.location}</span>
          </CardDescription>
          {event.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            {spotsRemaining !== undefined && (
              <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium">
                {spotsRemaining === 0
                  ? "No spots left"
                  : `${spotsRemaining} spot${spotsRemaining === 1 ? "" : "s"} left`}
              </span>
            )}
            {event.registrationDeadline && !registrationStatus.closed && (
              <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium">
                Register by {formatDate(event.registrationDeadline)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {registrationStatus.closed ? (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {registrationStatus.message}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11 text-base sm:h-10 sm:text-sm"
                />
              </div>

              {event.customFields?.map((field) => (
                <div key={field} className="space-y-2">
                  <Label htmlFor={field}>{field}</Label>
                  <Input
                    id={field}
                    value={customResponses[field] ?? ""}
                    onChange={(e) =>
                      setCustomResponses((prev) => ({
                        ...prev,
                        [field]: e.target.value,
                      }))
                    }
                    className="h-11 text-base sm:h-10 sm:text-sm"
                  />
                </div>
              ))}

              {error && (
                <div
                  role="alert"
                  className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                >
                  {error}
                </div>
              )}

              <Button
                type="submit"
                className="h-12 w-full text-base sm:h-11 sm:text-sm"
                size="lg"
                disabled={loading}
              >
                {loading ? "Registering..." : "Register for event"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
