"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Target, Zap, ArrowRight, CheckCircle2 } from "lucide-react";

export default function SinglePage() {
  return (
    <div className="min-h-screen bg-[#F2EBE2] flex items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-[#013220] mb-3">
            Single Player
          </h1>
          <p className="text-base md:text-lg text-[#855E42] font-medium">
            Tek başına oyna ve yeteneklerini test et
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Classic Mode Card */}
          <Link 
            href="/single/classic"
            className="group relative bg-white border-2 border-[#013220]/20 hover:border-[#013220] rounded-2xl p-6 md:p-8 transition-all duration-200 hover:shadow-xl"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-[#013220]/10 p-3 rounded-xl group-hover:bg-[#013220] transition-colors duration-200">
                <Target className="w-6 h-6 md:w-8 md:h-8 text-[#013220] group-hover:text-[#F2EBE2]" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-[#013220] mb-1">Classic</h2>
                <p className="text-sm text-[#855E42]">Detaylı ipuçları</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs md:text-sm text-[#013220]">
                <CheckCircle2 className="w-4 h-4 text-[#013220]" />
                <span>Sınırsız tahmin</span>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-[#013220]">
                <CheckCircle2 className="w-4 h-4 text-[#013220]" />
                <span>Detaylı ipuçları</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm px-2 py-1 bg-[#013220]/10 text-[#013220] rounded-lg font-medium">Rahat Tempo</span>
              <ArrowRight className="w-5 h-5 text-[#013220] group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* Rush Mode Card */}
          <Link 
            href="/single/rush"
            className="group relative bg-white border-2 border-[#855E42]/30 hover:border-[#855E42] rounded-2xl p-6 md:p-8 transition-all duration-200 hover:shadow-xl"
          >
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-[#855E42]/10 p-3 rounded-xl group-hover:bg-[#855E42] transition-colors duration-200">
                <Zap className="w-6 h-6 md:w-8 md:h-8 text-[#855E42] group-hover:text-[#F2EBE2]" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-[#013220] mb-1">Rush</h2>
                <p className="text-sm text-[#855E42]">Zamana karşı yarış</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 text-xs md:text-sm text-[#013220]">
                <CheckCircle2 className="w-4 h-4 text-[#855E42]" />
                <span>Kronometre</span>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-[#013220]">
                <CheckCircle2 className="w-4 h-4 text-[#855E42]" />
                <span>Hız odaklı</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs md:text-sm px-2 py-1 bg-[#855E42]/10 text-[#855E42] rounded-lg font-medium">Hızlı Tempo</span>
              <ArrowRight className="w-5 h-5 text-[#855E42] group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

