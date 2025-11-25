"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Gamepad2, Users, Target, Zap, BarChart3, LogIn, UserPlus, Anchor } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#F2EBE2] flex flex-col">
      {/* Hero Section - Compact */}
      <div className="flex-1 flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-6xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <div className="inline-block mb-4">
              <Anchor className="w-16 h-16 md:w-20 md:h-20 text-[#013220] mx-auto" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-[#013220] mb-3 md:mb-4">
              Onepiecedle Clash
            </h1>
            <p className="text-base md:text-lg text-[#855E42] max-w-xl mx-auto font-medium">
              One Piece karakterlerini tahmin et
            </p>
          </div>

          {/* Auth Buttons - Only if not logged in */}
          {!user && (
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8 md:mb-12 max-w-md mx-auto">
              <Link href="/auth/login" className="flex-1">
                <Button 
                  className="w-full bg-[#F2EBE2] text-[#013220] border-2 border-[#013220] hover:bg-[#013220] hover:text-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl py-6 flex items-center justify-center gap-2"
                  size="lg"
                >
                  <LogIn size={20} />
                  <span>Giriş Yap</span>
                </Button>
              </Link>
              <Link href="/auth/login" className="flex-1">
                <Button 
                  className="w-full bg-[#013220] text-[#F2EBE2] hover:bg-[#855E42] border-2 border-[#013220] hover:border-[#855E42] transition-all duration-200 font-semibold rounded-xl py-6 flex items-center justify-center gap-2"
                  size="lg"
                >
                  <UserPlus size={20} />
                  <span>Kayıt Ol</span>
                </Button>
              </Link>
            </div>
          )}

          {/* Game Modes - Compact Cards */}
          <div className="grid sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
            {/* Single Player Card */}
            <Link 
              href={user ? "/single" : "/auth/login"}
              className="group relative bg-white border-2 border-[#013220]/20 hover:border-[#013220] rounded-2xl p-6 md:p-8 transition-all duration-200 hover:shadow-xl"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-[#013220]/10 p-3 rounded-xl group-hover:bg-[#013220] transition-colors duration-200">
                  <Gamepad2 className="w-6 h-6 md:w-8 md:h-8 text-[#013220] group-hover:text-[#F2EBE2]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold text-[#013220] mb-1">Single Player</h2>
                  <p className="text-sm text-[#855E42]">Tek başına oyna</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="text-xs md:text-sm px-2 py-1 bg-[#013220]/10 text-[#013220] rounded-lg font-medium">Classic</span>
                  <span className="text-xs md:text-sm px-2 py-1 bg-[#855E42]/10 text-[#855E42] rounded-lg font-medium">Rush</span>
                </div>
                <span className="text-[#013220] group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>

            {/* Multiplayer Card */}
            <Link 
              href={user ? "/multiplayer" : "/auth/login"}
              className="group relative bg-white border-2 border-[#855E42]/30 hover:border-[#855E42] rounded-2xl p-6 md:p-8 transition-all duration-200 hover:shadow-xl"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-[#855E42]/10 p-3 rounded-xl group-hover:bg-[#855E42] transition-colors duration-200">
                  <Users className="w-6 h-6 md:w-8 md:h-8 text-[#855E42] group-hover:text-[#F2EBE2]" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl md:text-2xl font-bold text-[#013220] mb-1">Multiplayer</h2>
                  <p className="text-sm text-[#855E42]">Arkadaşlarınla yarış</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <span className="text-xs md:text-sm px-2 py-1 bg-[#855E42]/10 text-[#855E42] rounded-lg font-medium">2-8 Kişi</span>
                  <span className="text-xs md:text-sm px-2 py-1 bg-[#013220]/10 text-[#013220] rounded-lg font-medium">Realtime</span>
                </div>
                <span className="text-[#855E42] group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>
          </div>

          {/* Features - Minimal Icons */}
          <div className="grid grid-cols-3 gap-3 md:gap-4 max-w-2xl mx-auto">
            <div className="text-center p-3 md:p-4 bg-white/50 rounded-xl border border-[#013220]/10">
              <Target className="w-5 h-5 md:w-6 md:h-6 text-[#013220] mx-auto mb-2" />
              <p className="text-xs md:text-sm font-semibold text-[#013220]">269</p>
              <p className="text-xs text-[#855E42]">Karakter</p>
            </div>
            <div className="text-center p-3 md:p-4 bg-white/50 rounded-xl border border-[#855E42]/20">
              <Zap className="w-5 h-5 md:w-6 md:h-6 text-[#855E42] mx-auto mb-2" />
              <p className="text-xs md:text-sm font-semibold text-[#013220]">Anlık</p>
              <p className="text-xs text-[#855E42]">Yarış</p>
            </div>
            <div className="text-center p-3 md:p-4 bg-white/50 rounded-xl border border-[#013220]/10">
              <BarChart3 className="w-5 h-5 md:w-6 md:h-6 text-[#013220] mx-auto mb-2" />
              <p className="text-xs md:text-sm font-semibold text-[#013220]">Skor</p>
              <p className="text-xs text-[#855E42]">Takip</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
