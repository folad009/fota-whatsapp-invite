"use client";

import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/convex/_generated/api";
import { UserAdminPanel } from "@/components/UserAdminPanel";

export default function UsersPage() {
  const me = useQuery(api.users.getMe);
  const router = useRouter();

  useEffect(() => {
    if (me !== undefined && me.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [me, router]);

  if (me === undefined) {
    return <p className="text-muted-foreground">Loading...</p>;
  }

  if (me.role !== "admin") {
    return null;
  }

  return <UserAdminPanel />;
}
