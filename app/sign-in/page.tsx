import { AuthForm } from "@/components/AuthForm";
import Link from "next/link";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <Link
        href="/"
        className="mb-8 text-lg font-semibold text-primary"
      >
        WhatsApp Invites
      </Link>
      <AuthForm mode="signIn" />
    </div>
  );
}
