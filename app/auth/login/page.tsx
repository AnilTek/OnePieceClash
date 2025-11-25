"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Lock, LogIn, UserPlus } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        // Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        if (data.session) {
          // Email doğrulanmış mı kontrol et
          if (data.user && !data.user.email_confirmed_at) {
            await supabase.auth.signOut();
            throw new Error("Lütfen önce email adresinizi doğrulayın. Email kutunuzu kontrol edin.");
          }
          router.push("/single/classic");
        }
      } else {
        // Register
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        if (data.user) {
          // Kullanıcı oluşturuldu ama email confirmation gerekiyor
          if (data.user.identities && data.user.identities.length === 0) {
            // Email zaten kullanılıyor
            setError("Bu email adresi zaten kayıtlı.");
          } else {
            setMessage(
              "Kayıt başarılı! Lütfen email adresinize gelen doğrulama linkine tıklayın. Email'i doğrulamadan giriş yapamazsınız."
            );
            setEmail("");
            setPassword("");
          }
        }
      }
    } catch (error: any) {
      setError(error.message || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;
    } catch (error: any) {
      setError(error.message || "Google ile giriş yapılamadı");
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F2EBE2]">
      <Card className="w-full max-w-md mx-4 bg-white border-2 border-[#013220]/20 shadow-xl rounded-2xl">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center text-[#013220] flex items-center justify-center gap-2">
            <span>⚓</span>
            <span>Onepiecedle Clash</span>
          </CardTitle>
          <CardDescription className="text-center text-[#855E42] text-base">
            {isLogin ? "Hesabınıza giriş yapın" : "Yeni hesap oluşturun"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle between Login/Register */}
          <div className="flex gap-2 p-1 bg-[#855E42]/10 rounded-xl border border-[#855E42]/20">
            <button
              type="button"
              onClick={() => {
                setIsLogin(true);
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                isLogin
                  ? "bg-[#855E42] text-[#F2EBE2] shadow-md"
                  : "text-[#855E42] hover:bg-[#855E42]/20"
              }`}
            >
              <LogIn size={16} />
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => {
                setIsLogin(false);
                setError(null);
                setMessage(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                !isLogin
                  ? "bg-[#855E42] text-[#F2EBE2] shadow-md"
                  : "text-[#855E42] hover:bg-[#855E42]/20"
              }`}
            >
              <UserPlus size={16} />
              Kayıt Ol
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          {/* Success Message */}
          {message && (
            <div className="p-3 text-sm text-[#013220] bg-[#013220]/10 border border-[#013220]/20 rounded-md">
              {message}
            </div>
          )}

          {/* Email/Password Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[#013220] font-semibold flex items-center gap-2">
                <Mail size={16} />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="ornek@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="!bg-white border-2 border-[#855E42]/30 focus:border-[#013220] focus:ring-[#013220] focus:ring-2 text-[#013220] placeholder:text-[#855E42]/60 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[#013220] font-semibold flex items-center gap-2">
                <Lock size={16} />
                Şifre
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                disabled={loading}
                className="!bg-white border-2 border-[#855E42]/30 focus:border-[#013220] focus:ring-[#013220] focus:ring-2 text-[#013220] placeholder:text-[#855E42]/60 rounded-xl"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-[#F2EBE2] text-[#013220] border-2 border-[#013220] hover:bg-[#013220] hover:text-[#F2EBE2] hover:border-[#855E42] transition-all duration-200 font-semibold shadow-md rounded-xl py-6 flex items-center justify-center gap-2" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#013220]"></div>
                  <span>Lütfen bekleyin...</span>
                </>
              ) : (
                <>
                  {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                  <span>{isLogin ? "Giriş Yap" : "Kayıt Ol"}</span>
                </>
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#855E42]/30" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#F2EBE2] px-2 text-[#855E42] font-medium">
                veya
              </span>
            </div>
          </div>

          {/* Google Login */}
          <Button
            type="button"
            variant="outline"
            className="w-full border-2 border-[#855E42] text-[#855E42] hover:bg-[#855E42] hover:text-[#F2EBE2] transition-all duration-200 bg-transparent rounded-xl py-6 flex items-center justify-center gap-2 font-semibold"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span>Google ile {isLogin ? "Giriş Yap" : "Kayıt Ol"}</span>
          </Button>

          {/* Forgot Password Link */}
          {isLogin && (
            <div className="text-center">
              <a
                href="/auth/forgot-password"
                className="text-sm text-[#013220] hover:text-[#855E42] transition-colors font-semibold underline-offset-2 hover:underline"
              >
                Şifremi unuttum
              </a>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
