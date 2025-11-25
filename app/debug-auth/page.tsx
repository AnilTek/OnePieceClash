"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DebugAuthPage() {
  const { user, session, loading } = useAuth();
  const router = useRouter();

  // Production'da bu sayfaya erişimi engelle
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      router.push("/");
    }
  }, [router]);

  // Production'da hiçbir şey gösterme
  if (process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Auth Debug Page (Development Only)</h1>
        
        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Loading:</h2>
          <pre>{JSON.stringify(loading, null, 2)}</pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">User:</h2>
          <pre className="text-xs overflow-auto">
            {user ? JSON.stringify(user, null, 2) : "null"}
          </pre>
        </div>

        <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
          <h2 className="font-semibold mb-2">Session:</h2>
          <pre className="text-xs overflow-auto">
            {session ? JSON.stringify(session, null, 2) : "null"}
          </pre>
        </div>
      </div>
    </div>
  );
}

