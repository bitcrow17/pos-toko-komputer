"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/src/context/AppContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const isPartnerRoute = pathname.startsWith("/partner");

  useEffect(() => {
    if (!currentUser && !isLoginPage && !isPartnerRoute) {
      router.replace("/login");
      return;
    }

    if (currentUser && isLoginPage) {
      router.replace(
        currentUser.role === "admin" ? "/admin/dashboard" : "/kasir",
      );
    }
  }, [currentUser, isLoginPage, isPartnerRoute, router]);

  if (!currentUser && !isLoginPage && !isPartnerRoute) {
    return null;
  }

  if (currentUser && isLoginPage) {
    return null;
  }

  return <>{children}</>;
}
