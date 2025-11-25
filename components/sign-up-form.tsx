"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mail, Lock, UserPlus, LogIn } from "lucide-react";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/protected`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="bg-white border-2 border-[#013220]/20 shadow-xl rounded-2xl">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-[#013220] flex items-center justify-center gap-2">
            <span>⚓</span>
            <span>Onepiecedle Clash</span>
          </CardTitle>
          <CardDescription className="text-center text-[#855E42] text-base">Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignUp}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-2">
                <Label htmlFor="email" className="text-[#013220] font-semibold flex items-center gap-2">
                  <Mail size={16} />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="!bg-white border-2 border-[#855E42]/30 focus:border-[#013220] focus:ring-[#013220] focus:ring-2 text-[#013220] placeholder:text-[#855E42]/60 rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password" className="text-[#013220] font-semibold flex items-center gap-2">
                    <Lock size={16} />
                    Password
                  </Label>
                </div>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="!bg-white border-2 border-[#855E42]/30 focus:border-[#013220] focus:ring-[#013220] focus:ring-2 text-[#013220] placeholder:text-[#855E42]/60 rounded-xl"
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="repeat-password" className="text-[#013220] font-semibold flex items-center gap-2">
                    <Lock size={16} />
                    Repeat Password
                  </Label>
                </div>
                <Input
                  id="repeat-password"
                  type="password"
                  required
                  value={repeatPassword}
                  onChange={(e) => setRepeatPassword(e.target.value)}
                  className="!bg-white border-2 border-[#855E42]/30 focus:border-[#013220] focus:ring-[#013220] focus:ring-2 text-[#013220] placeholder:text-[#855E42]/60 rounded-xl"
                />
              </div>
              {error && <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-2">{error}</p>}
              <Button 
                type="submit" 
                className="w-full bg-[#F2EBE2] text-[#013220] border-2 border-[#013220] hover:bg-[#013220] hover:text-[#F2EBE2] hover:border-[#855E42] transition-all duration-200 font-semibold shadow-md rounded-xl py-6 flex items-center justify-center gap-2" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#013220]"></div>
                    <span>Creating an account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={18} />
                    <span>Sign up</span>
                  </>
                )}
              </Button>
            </div>
            <div className="mt-4 text-center text-sm">
              Already have an account?{" "}
              <Link href="/auth/login" className="text-[#013220] hover:text-[#855E42] transition-colors font-semibold underline-offset-2 hover:underline flex items-center justify-center gap-1">
                <LogIn size={14} />
                <span>Login</span>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
