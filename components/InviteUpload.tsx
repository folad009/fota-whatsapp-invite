"use client";

import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function InviteUpload({ eventId }: { eventId: Id<"events"> }) {
  const addInvitees = useMutation(api.invites.addInvitees);
  const [phonesText, setPhonesText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ added: number; skipped: number } | null>(
    null
  );
  const [error, setError] = useState("");

  const handlePasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await addInvitees({ eventId, phonesText });
      setResult(res);
      setPhonesText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add invitees");
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const csvContent = await file.text();
      const res = await addInvitees({ eventId, csvContent });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse CSV");
    } finally {
      setLoading(false);
      e.target.value = "";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add invitees</CardTitle>
        <CardDescription>
          Paste phone numbers (one per line) or upload a CSV. Use international
          format or local numbers (e.g. 08012345678). CSV with headers:
          name and phone columns in any order (e.g. NAME, PHONE NUMBER). Legacy
          CSV: phone-only in the first column.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handlePasteSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="phones">Phone numbers</Label>
            <Textarea
              id="phones"
              placeholder={"+2348012345678\n+2348098765432"}
              value={phonesText}
              onChange={(e) => setPhonesText(e.target.value)}
              rows={5}
            />
          </div>
          <Button type="submit" disabled={loading || !phonesText.trim()}>
            Add invitees
          </Button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="csv">Upload CSV</Label>
          <p className="text-xs text-muted-foreground">
            Example with headers: NAME,PHONE NUMBER — then John Doe,08012345678
          </p>
          <input
            id="csv"
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvUpload}
            disabled={loading}
            className="block w-full text-sm"
          />
        </div>

        {result && (
          <p className="text-sm text-primary">
            Added {result.added} invitee{result.added !== 1 ? "s" : ""}
            {result.skipped > 0 && ` (${result.skipped} skipped as duplicates)`}
          </p>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
