"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // URL'den hash veya query parametrelerini al
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const queryParams = new URLSearchParams(window.location.search);

        const accessToken = hashParams.get("access_token") || queryParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token") || queryParams.get("refresh_token");
        const error = hashParams.get("error") || queryParams.get("error");
        const errorDescription = hashParams.get("error_description") || queryParams.get("error_description");

        if (error) {
          throw new Error(errorDescription || error);
        }

        if (accessToken && refreshToken) {
          // Token'ları Supabase'e set et
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) throw sessionError;
        }

        // Session'ı kontrol et
        const { data: { session }, error: sessionCheckError } = await supabase.auth.getSession();

        if (sessionCheckError) throw sessionCheckError;

        if (session) {
          setStatus("success");
          // Başarılı authentication sonrası redirect
          setTimeout(() => {
            router.push("/single/classic");
          }, 1500);
        } else {
          throw new Error("Oturum oluşturulamadı");
        }
      } catch (error: any) {
        console.error("Auth callback error:", error);
        setStatus("error");
        setErrorMessage(error.message || "Doğrulama sırasında bir hata oluştu");
        
        // Hata durumunda 3 saniye sonra login'e yönlendir
        setTimeout(() => {
          router.push("/auth/login");
        }, 3000);
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white dark:bg-gray-950 rounded-lg shadow-lg p-8 text-center">
          {status === "loading" && (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
              <h2 className="text-xl font-semibold">Doğrulanıyor...</h2>
              <p className="text-gray-600 dark:text-gray-400">
                Lütfen bekleyin
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="rounded-full h-16 w-16 bg-green-100 dark:bg-green-900/20 flex items-center justify-center mx-auto">
                <svg
                  className="h-8 w-8 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">
                Başarılı!
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Yönlendiriliyorsunuz...
              </p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="rounded-full h-16 w-16 bg-red-100 dark:bg-red-900/20 flex items-center justify-center mx-auto">
                <svg
                  className="h-8 w-8 text-red-600 dark:text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-red-600 dark:text-red-400">
                Hata
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                {errorMessage}
              </p>
              <p className="text-sm text-gray-500">
                Giriş sayfasına yönlendiriliyorsunuz...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

