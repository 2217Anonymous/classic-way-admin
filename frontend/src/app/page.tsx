"use client";

import { Suspense, useEffect, useState } from "react";

import { AdminDashboard } from "@/components/AdminDashboard";
import { LoginForm } from "@/components/LoginForm";
import { useAppSelector } from "@/store/hooks";

const BOOT_SHELL =
  "min-h-screen bg-[var(--background)] text-[var(--foreground)]";

function HomeContent() {
  const { token, hydrated } = useAppSelector((state) => state.auth);
  // Gate on mount so server HTML and the first client paint always match.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !hydrated) {
    return <div className={BOOT_SHELL} aria-busy="true" />;
  }

  return token ? <AdminDashboard /> : <LoginForm />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className={BOOT_SHELL} aria-busy="true" />}>
      <HomeContent />
    </Suspense>
  );
}
