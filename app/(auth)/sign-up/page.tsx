// src/app/(auth)/sign-up/page.tsx
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Sign Up",
  description: "Create a new account",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4">
      <AuthForm mode="signup" />
    </div>
  );
}