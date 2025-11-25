"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, LogIn, CheckCircle2 } from "lucide-react";

// Random 6-character code generator
const generateLobbyCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (I, O, 0, 1)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export default function MultiplayerPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();

  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Lobby
  const handleCreateLobby = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const code = generateLobbyCode();

      // Lobi oluştur
      const { data: lobby, error: lobbyError } = await supabase
        .from("lobbies")
        .insert({
          code: code,
          host_id: user.id,
          status: "waiting",
          max_rounds: 3, // Default, lobi içinde değiştirilebilir
          max_players: 8,
          arc_limit: 30, // Default: Egghead (all)
          current_round: 0,
          environment: process.env.NODE_ENV === "production" ? "prod" : "dev",
        })
        .select()
        .single();

      if (lobbyError) throw lobbyError;

      // Host'u lobby_players'a ekle
      const { error: playerError } = await supabase
        .from("lobby_players")
        .insert({
          lobby_id: lobby.id,
          user_id: user.id,
          is_ready: true, // Host her zaman ready
          score_total: 0,
          rounds_won: 0,
        });

      if (playerError) throw playerError;

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Lobby created:", code);
      }

      // DEBUG: Redirect öncesi log
      console.log("🔍 DEBUG - Redirecting with code:", code);
      console.log("🔍 DEBUG - Code type:", typeof code);
      console.log("🔍 DEBUG - Code value:", JSON.stringify(code));

      // Lobi sayfasına yönlendir
      router.push(`/multiplayer/lobby/${code}`);
    } catch (err: any) {
      console.error("❌ Create lobby error:", err);
      setError(err.message || "Lobi oluşturulamadı");
    } finally {
      setLoading(false);
    }
  };

  // Join Lobby
  const handleJoinLobby = async () => {
    if (!user || !joinCode.trim()) {
      setError("Lütfen lobi kodunu girin");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const code = joinCode.trim().toUpperCase();

      // Lobi var mı kontrol et
      const { data: lobby, error: lobbyError } = await supabase
        .from("lobbies")
        .select("*")
        .eq("code", code)
        .eq("status", "waiting")
        .single();

      if (lobbyError || !lobby) {
        throw new Error("Lobi bulunamadı veya oyun başlamış");
      }

      // Oyuncu sayısı kontrolü
      const { data: players, error: playersError } = await supabase
        .from("lobby_players")
        .select("id")
        .eq("lobby_id", lobby.id);

      if (playersError) throw playersError;

      if (players.length >= lobby.max_players) {
        throw new Error("Lobi dolu");
      }

      // Zaten katılmış mı kontrol et
      const { data: existingPlayer } = await supabase
        .from("lobby_players")
        .select("id")
        .eq("lobby_id", lobby.id)
        .eq("user_id", user.id)
        .single();

      if (existingPlayer) {
        // Zaten katılmış, direkt yönlendir
        router.push(`/multiplayer/lobby/${code}`);
        return;
      }

      // Lobiye katıl
      const { error: joinError } = await supabase
        .from("lobby_players")
        .insert({
          lobby_id: lobby.id,
          user_id: user.id,
          is_ready: false,
          score_total: 0,
          rounds_won: 0,
        });

      if (joinError) throw joinError;

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Joined lobby:", code);
      }

      // Lobi sayfasına yönlendir
      router.push(`/multiplayer/lobby/${code}`);
    } catch (err: any) {
      console.error("❌ Join lobby error:", err);
      setError(err.message || "Lobiye katılınamadı");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2EBE2] flex items-center justify-center px-4 py-8 md:py-12">
      <div className="w-full max-w-5xl mx-auto">
        <div className="text-center mb-8 md:mb-12">
          <h1 className="text-3xl md:text-5xl font-bold text-[#013220] mb-3">
            Multiplayer
          </h1>
          <p className="text-base md:text-lg text-[#855E42] font-medium">
            Arkadaşlarınla yarış
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl max-w-md mx-auto">
            <p className="text-red-700 text-sm font-medium text-center">{error}</p>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          {/* Create Lobby Card */}
          <div className="group relative bg-white border-2 border-[#013220]/20 hover:border-[#013220] rounded-2xl p-6 md:p-8 transition-all duration-200 hover:shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-[#013220]/10 p-3 rounded-xl group-hover:bg-[#013220] transition-colors duration-200">
                <Users className="w-6 h-6 md:w-8 md:h-8 text-[#013220] group-hover:text-[#F2EBE2]" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-[#013220] mb-1">Lobi Oluştur</h2>
                <p className="text-sm text-[#855E42]">Yeni oyun başlat</p>
              </div>
            </div>
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs md:text-sm text-[#013220]">
                <CheckCircle2 className="w-4 h-4 text-[#013220]" />
                <span>2-8 oyuncu</span>
              </div>
              <div className="flex items-center gap-2 text-xs md:text-sm text-[#013220]">
                <CheckCircle2 className="w-4 h-4 text-[#013220]" />
                <span>3, 5 veya 7 round</span>
              </div>
            </div>
            <Button
              onClick={handleCreateLobby}
              disabled={loading}
              className="w-full bg-[#F2EBE2] text-[#013220] border-2 border-[#013220] hover:bg-[#013220] hover:text-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl py-6 flex items-center justify-center gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#013220]"></div>
                  <span>Oluşturuluyor...</span>
                </>
              ) : (
                <>
                  <Users className="w-5 h-5" />
                  <span>Lobi Oluştur</span>
                </>
              )}
            </Button>
          </div>

          {/* Join Lobby Card */}
          <div className="group relative bg-white border-2 border-[#855E42]/30 hover:border-[#855E42] rounded-2xl p-6 md:p-8 transition-all duration-200 hover:shadow-xl">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-[#855E42]/10 p-3 rounded-xl group-hover:bg-[#855E42] transition-colors duration-200">
                <LogIn className="w-6 h-6 md:w-8 md:h-8 text-[#855E42] group-hover:text-[#F2EBE2]" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl md:text-2xl font-bold text-[#013220] mb-1">Lobiye Katıl</h2>
                <p className="text-sm text-[#855E42]">Kod ile katıl</p>
              </div>
            </div>
            <div className="space-y-4 mb-6">
              <div className="space-y-2">
                <Label htmlFor="lobby-code" className="text-[#013220] font-semibold text-sm">Lobi Kodu</Label>
                <Input
                  id="lobby-code"
                  type="text"
                  placeholder="ABC123"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  className="text-center text-xl md:text-2xl font-mono tracking-widest !bg-white border-2 border-[#855E42]/30 focus:border-[#013220] focus:ring-[#013220] focus:ring-2 text-[#013220] rounded-xl"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleJoinLobby();
                    }
                  }}
                />
              </div>
            </div>
            <Button
              onClick={handleJoinLobby}
              disabled={loading || !joinCode.trim()}
              className="w-full bg-[#855E42] text-[#F2EBE2] hover:bg-[#855E42]/90 border-2 border-[#855E42] transition-all duration-200 font-semibold rounded-xl py-6 flex items-center justify-center gap-2 disabled:opacity-50"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#F2EBE2]"></div>
                  <span>Katılınıyor...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Lobiye Katıl</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
