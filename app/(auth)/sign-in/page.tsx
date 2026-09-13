// src/app/(auth)/sign-in/page.tsx
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign In",
  description: "Sign in to your account",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <AuthForm mode="signin" />
    </div>
  );
}