import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";
import { SignInHero } from "@/components/SignInHero";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background lg:flex-row">
      <SignInHero />

      <div className="relative flex flex-1 flex-col lg:-ml-12 lg:w-[45%]">
        <div className="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-16 lg:py-12">
          <header className="mb-10 flex items-center justify-between">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-foreground"
            >
              WhatsApp Invites
            </Link>
          </header>

          <AuthForm />
        </div>
      </div>
    </div>
  );
}
