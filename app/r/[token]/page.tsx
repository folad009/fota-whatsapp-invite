"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { RegistrationForm } from "@/components/RegistrationForm";

export default function RegisterPage() {
  const params = useParams();
  const token = params.token as string;
  const data = useQuery(api.registrations.getInviteByToken, { token });

  if (data === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Invalid invite link</h1>
          <p className="mt-2 text-muted-foreground">
            This link may have expired or is incorrect.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-10">
      <RegistrationForm
        token={token}
        inviteeName={data.invite.inviteeName}
        event={data.event}
        alreadyRegistered={data.alreadyRegistered}
      />
    </div>
  );
}
