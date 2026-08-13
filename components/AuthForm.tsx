"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearConvexAuthStorage } from "@/lib/clear-auth-storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

export function AuthForm({ className }: { className?: string }) {
  const { signIn, signOut } = useAuthActions();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    clearConvexAuthStorage();
    setReady(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      clearConvexAuthStorage();
      try {
        await signOut();
      } catch {
        // Ignore — cookies are cleared even when the session is invalid
      }

      const result = await signIn("password", {
        email,
        password,
        flow: "signIn",
      });
      if (result.signingIn) {
        router.push("/dashboard");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className={cn("w-full max-w-md animate-pulse space-y-4", className)}>
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-12 rounded-lg bg-muted" />
        <div className="h-12 rounded-lg bg-muted" />
        <div className="h-12 rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className={cn("w-full max-w-md", className)}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Hi Organizer
        </h1>
        <p className="mt-2 text-muted-foreground">
          Welcome to WhatsApp Invites
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email" className="sr-only">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-12 rounded-xl border-border/80 px-4 text-base placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="sr-only">
            Password
          </Label>
          <Input
            id="password"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="current-password"
            className="h-12 rounded-xl border-border/80 px-4 text-base placeholder:text-muted-foreground/70"
          />
        </div>

        <div className="flex justify-end">
          <span
            className="cursor-not-allowed text-sm text-muted-foreground/70"
            title="Contact your administrator to reset your password"
          >
            Forgot password?
          </span>
        </div>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <Button
          type="submit"
          size="lg"
          className="h-12 w-full rounded-xl text-base font-semibold"
          disabled={loading}
        >
          {loading ? "Please wait..." : "Login"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Need an account? Contact your administrator.
      </p>
    </div>
  );
}
