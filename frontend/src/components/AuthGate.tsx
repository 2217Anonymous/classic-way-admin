"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { useAppSelector } from "@/store/hooks";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, hydrated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace("/");
    }
  }, [hydrated, token, router]);

  if (!hydrated) {
    return <div className="min-h-screen bg-[#f5f8fc]" />;
  }

  if (!token) {
    return <LoginForm />;
  }

  return <>{children}</>;
}
