import type { Metadata } from "next";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "WhatsApp Event Invites",
  description: "Send event invites via WhatsApp and manage RSVPs",
};

const convexStorageNamespace =
  process.env.NEXT_PUBLIC_CONVEX_URL?.replace(/\/$/, "") ?? undefined;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ConvexAuthNextjsServerProvider storageNamespace={convexStorageNamespace}>
      <html lang="en">
        <body className="min-h-screen antialiased">
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
