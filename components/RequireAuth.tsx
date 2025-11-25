"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

interface RequireAuthProps {
  children: React.ReactNode;
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  if (process.env.NODE_ENV === "development") {
    console.log("🔒 RequireAuth - user:", user?.email, "loading:", loading);
  }

  useEffect(() => {
    // Sadece loading bittikten sonra kontrol et
    if (!loading && !user) {
      if (process.env.NODE_ENV === "development") {
        console.log("❌ No user, redirecting to login...");
      }
      router.push("/auth/login");
    } else if (!loading && user) {
      if (process.env.NODE_ENV === "development") {
        console.log("✅ User authenticated:", user.email);
      }
    }
  }, [user, loading, router]);

  // Loading state - auth durumu kontrol ediliyor
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Loading bitti ve user yok - redirect edilecek
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Yönlendiriliyorsunuz...</p>
        </div>
      </div>
    );
  }

  // User authenticated, render children
  return <>{children}</>;
}

