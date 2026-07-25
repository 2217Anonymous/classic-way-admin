"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { LoginForm } from "@/components/LoginForm";
import { useAppSelector } from "@/store/hooks";

const BOOT_SHELL =
  "min-h-screen bg-[var(--background)] text-[var(--foreground)]";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { token, hydrated } = useAppSelector((state) => state.auth);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && hydrated && !token) {
      router.replace("/");
    }
  }, [mounted, hydrated, token, router]);

  if (!mounted || !hydrated) {
    return <div className={BOOT_SHELL} aria-busy="true" />;
  }

  if (!token) {
    return <LoginForm />;
  }

  return <>{children}</>;
}
