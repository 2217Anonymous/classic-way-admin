"use client";

import { Suspense } from "react";

import { AdminDashboard } from "@/components/AdminDashboard";
import { LoginForm } from "@/components/LoginForm";
import { useAppSelector } from "@/store/hooks";

function HomeContent() {
  const { token, hydrated } = useAppSelector((state) => state.auth);

  if (!hydrated) {
    return <div className="min-h-screen bg-[#f5f8fc]" />;
  }
  return token ? <AdminDashboard /> : <LoginForm />;
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f5f8fc]" />}>
      <HomeContent />
    </Suspense>
  );
}
