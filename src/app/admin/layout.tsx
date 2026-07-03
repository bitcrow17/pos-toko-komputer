"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/src/context/AppContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (currentUser && currentUser.role !== "admin") {
      router.replace("/kasir");
    }
  }, [currentUser, router]);

  if (!currentUser || currentUser.role !== "admin") {
    return null;
  }

  return <>{children}</>;
}
