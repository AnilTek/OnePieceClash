"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { Button } from "./ui/button";
import { Home, Gamepad2, Users, User, LogIn, LogOut, Anchor } from "lucide-react";

export function Navbar() {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const isActive = (path: string) => {
    return pathname === path || pathname.startsWith(path + "/");
  };

  if (!mounted) {
    return (
      <nav className="border-b-2 border-[#013220]/20 bg-[#013220] shadow-md">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link 
              href="/" 
              className="text-lg md:text-xl font-bold text-[#F2EBE2] hover:text-[#855E42] transition-colors flex items-center gap-1 md:gap-2"
            >
              <Anchor className="w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">Onepiecedle Clash</span>
              <span className="sm:hidden">OP Clash</span>
            </Link>
            <div className="flex items-center gap-2 md:gap-6">
              <div className="w-12 md:w-16 h-8 bg-[#855E42]/20 rounded-xl animate-pulse" />
            </div>
          </div>
        </div>
      </nav>
    );
  }

  const homeClassName = isActive("/") && pathname === "/"
    ? "flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 bg-[#F2EBE2] text-[#013220] shadow-md"
    : "flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 text-[#F2EBE2] hover:bg-[#855E42] hover:text-[#F2EBE2]";

  const singleClassName = isActive("/single")
    ? "flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 bg-[#F2EBE2] text-[#013220] shadow-md"
    : "flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 text-[#F2EBE2] hover:bg-[#855E42] hover:text-[#F2EBE2]";

  const multiplayerClassName = isActive("/multiplayer")
    ? "flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 bg-[#F2EBE2] text-[#013220] shadow-md"
    : "flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 text-[#F2EBE2] hover:bg-[#855E42] hover:text-[#F2EBE2]";

  const profileClassName = isActive("/profile")
    ? "flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 bg-[#F2EBE2] text-[#013220] shadow-md"
    : "flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 text-[#F2EBE2] hover:bg-[#855E42] hover:text-[#F2EBE2]";

  return (
    <nav className="border-b-2 border-[#013220]/20 bg-[#013220] shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link 
            href="/" 
            className="text-lg md:text-xl font-bold text-[#F2EBE2] hover:text-[#855E42] transition-colors flex items-center gap-1 md:gap-2"
          >
              <Anchor className="w-5 h-5 md:w-6 md:h-6" />
              <span className="hidden sm:inline">Onepiecedle Clash</span>
              <span className="sm:hidden">OP Clash</span>
          </Link>

          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/" className={homeClassName}>
              <Home size={16} />
              <span className="hidden sm:inline">Home</span>
            </Link>

            {user && (
              <>
                <Link href="/single" className={singleClassName}>
                  <Gamepad2 size={16} />
                  <span className="hidden sm:inline">Single</span>
                </Link>

                <Link href="/multiplayer" className={multiplayerClassName}>
                  <Users size={16} />
                  <span className="hidden sm:inline">Multiplayer</span>
                </Link>

                <Link href="/profile" className={profileClassName}>
                  <User size={16} />
                  <span className="hidden sm:inline">Profile</span>
                </Link>
              </>
            )}

            <div className="flex items-center gap-2 md:gap-3 ml-2 md:ml-4 border-l-2 border-[#855E42]/30 pl-3 md:pl-6">
              {loading ? (
                <div className="w-16 md:w-20 h-8 md:h-9 bg-[#855E42]/20 rounded-xl animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2 md:gap-3">
                  <span className="text-xs md:text-sm text-[#F2EBE2]/80 font-medium hidden lg:block">
                    {user.email?.split("@")[0]}
                  </span>
                  <Button
                    onClick={handleSignOut}
                    className="bg-[#F2EBE2] text-[#013220] hover:bg-[#855E42] hover:text-[#F2EBE2] border-2 border-transparent hover:border-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl flex items-center gap-1 md:gap-2 px-2 md:px-4"
                    size="sm"
                  >
                    <LogOut size={14} className="md:w-4 md:h-4" />
                    <span className="hidden sm:inline text-xs md:text-sm">Logout</span>
                  </Button>
                </div>
              ) : (
                <Link href="/auth/login">
                  <Button 
                    className="bg-[#F2EBE2] text-[#013220] hover:bg-[#855E42] hover:text-[#F2EBE2] border-2 border-transparent hover:border-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl flex items-center gap-1 md:gap-2 px-2 md:px-4" 
                    size="sm"
                  >
                    <LogIn size={14} className="md:w-4 md:h-4" />
                    <span className="hidden sm:inline text-xs md:text-sm">Login</span>
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
