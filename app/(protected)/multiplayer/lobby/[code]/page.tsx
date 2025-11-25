"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Users, Copy, CheckCircle2, XCircle, Settings, Play, LogOut, Crown } from "lucide-react";

// Arc Dictionary
const ARC_LIST = [
  'Romance Dawn', 'Orange Town', 'Syrup Village', 'Baratie', 'Arlong Park',
  'Loguetown', 'Reverse Mountain', 'Whiskey Peak', 'Little Garden', 'Drum Island',
  'Alabasta', 'Jaya', 'Skypiea', 'Long Ring Long Land', 'Water 7',
  'Enies Lobby', 'Thriller Bark', 'Sabaody Archipelago', 'Amazon Lily', 'Impel Down',
  'Marineford', 'Post-War', 'Return To Sabaody', 'Fishman Island', 'Punk Hazard',
  'Dressrosa', 'Zou', 'Whole Cake Island', 'Reverie', 'Wano', 'Egghead'
];

interface Lobby {
  id: number;
  code: string;
  host_id: string;
  status: string;
  max_rounds: number;
  max_players: number;
  arc_limit: number;
  current_round: number;
}

interface LobbyPlayer {
  id: number;
  user_id: string;
  is_ready: boolean;
  score_total: number;
  rounds_won: number;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const { user } = useAuth();

  const lobbyCode = params.code as string;

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);
  const [avatarUrls, setAvatarUrls] = useState<Map<string, string>>(new Map());

  const isHost = lobby && user && lobby.host_id === user.id;
  const currentPlayer = players.find(p => p.user_id === user?.id);

  // Avatar URL yükleme fonksiyonu
  const loadAvatarUrl = async (userId: string, avatarUrl: string | null) => {
    if (!avatarUrl || avatarUrls.has(userId)) return;

    try {
      const fileName = avatarUrl.startsWith("character-images/")
        ? avatarUrl.replace("character-images/", "")
        : avatarUrl;

      const { data: signedData, error: signedError } = await supabase
        .storage
        .from("character-images")
        .createSignedUrl(fileName, 31536000);

      if (!signedError && signedData) {
        setAvatarUrls(prev => new Map(prev).set(userId, signedData.signedUrl));
      }
    } catch (err) {
      console.error("Failed to get avatar signed URL:", err);
    }
  };

  // Initial load
  useEffect(() => {
    if (!lobbyCode || !user) return;

    const loadLobby = async () => {
      try {
        setLoading(true);

        // Lobi bilgilerini çek
        const { data: lobbyData, error: lobbyError } = await supabase
          .from("lobbies")
          .select("*")
          .eq("code", lobbyCode)
          .single();

        if (lobbyError) throw new Error("Lobi bulunamadı");

        setLobby(lobbyData);

        // Oyuncuları çek
        const { data: playersData, error: playersError } = await supabase
          .from("lobby_players")
          .select("*")
          .eq("lobby_id", lobbyData.id);

        if (playersError) throw playersError;

        // Profil bilgilerini ayrı çek
        if (playersData && playersData.length > 0) {
          const userIds = playersData.map(p => p.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", userIds);

          // Profil bilgilerini oyunculara ekle
          const playersWithProfiles = playersData.map(player => ({
            ...player,
            profiles: profilesData?.find(p => p.id === player.user_id),
          }));

          setPlayers(playersWithProfiles || []);
          
          // Avatar URL'lerini yükle
          playersWithProfiles.forEach(player => {
            if (player.profiles?.avatar_url) {
              loadAvatarUrl(player.user_id, player.profiles.avatar_url);
            }
          });
        } else {
          setPlayers([]);
        }

        // Eğer oyun başlamışsa, oyun sayfasına yönlendir
        if (lobbyData.status === "in_progress") {
          router.push(`/multiplayer/game/${lobbyCode}`);
        }

        // Eğer oyun bitmiş veya iptal edilmişse
        if (lobbyData.status === "finished" || lobbyData.status === "cancelled") {
          setError("Bu lobi artık aktif değil");
        }
      } catch (err: any) {
        console.error("Load lobby error:", err);
        setError(err.message || "Lobi yüklenemedi");
      } finally {
        setLoading(false);
      }
    };

    loadLobby();
  }, [lobbyCode, user, supabase, router]);

  // Realtime subscriptions
  useEffect(() => {
    if (!lobby || !user) return;

    const channel = supabase.channel(`lobby:${lobby.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobby.id}`
        },
        (payload) => {
          if (process.env.NODE_ENV === "development") {
            console.log('Lobby changed:', payload);
          }
          
          if (payload.eventType === 'UPDATE') {
            const newLobby = payload.new as Lobby;
            setLobby(newLobby);

            // Oyun başladıysa yönlendir
            if (newLobby.status === 'in_progress') {
              router.push(`/multiplayer/game/${lobbyCode}`);
            }

            // Lobi iptal edildiyse
            if (newLobby.status === 'cancelled') {
              setError("Host lobiden ayrıldı. Lobi iptal edildi.");
              setTimeout(() => {
                router.push('/multiplayer');
              }, 3000);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobby_players',
          filter: `lobby_id=eq.${lobby.id}`
        },
        async (payload) => {
          if (process.env.NODE_ENV === "development") {
            console.log('Players changed:', payload);
          }
          
          // Oyuncuları yeniden çek
          const { data: playersData } = await supabase
            .from("lobby_players")
            .select("*")
            .eq("lobby_id", lobby.id);

          if (playersData && playersData.length > 0) {
            const userIds = playersData.map(p => p.user_id);
            const { data: profilesData } = await supabase
              .from("profiles")
              .select("id, username, avatar_url")
              .in("id", userIds);

            // Profil bilgilerini oyunculara ekle
            const playersWithProfiles = playersData.map(player => ({
              ...player,
              profiles: profilesData?.find(p => p.id === player.user_id),
            }));

            setPlayers(playersWithProfiles);
            
            // Avatar URL'lerini yükle
            playersWithProfiles.forEach(player => {
              if (player.profiles?.avatar_url) {
                loadAvatarUrl(player.user_id, player.profiles.avatar_url);
              }
            });
          } else if (playersData) {
            setPlayers([]);
          }
        }
      )
      .subscribe();

    setChannel(channel);

    return () => {
      channel.unsubscribe();
    };
  }, [lobby, user, supabase, lobbyCode, router]);

  // Ready toggle
  const handleToggleReady = async () => {
    if (!currentPlayer || isHost) return;

    try {
      const { error } = await supabase
        .from("lobby_players")
        .update({ is_ready: !currentPlayer.is_ready })
        .eq("id", currentPlayer.id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Toggle ready error:", err);
      alert("Ready durumu değiştirilemedi");
    }
  };

  // Update settings (Host only)
  const handleUpdateSettings = async (field: string, value: number) => {
    if (!isHost || !lobby) return;

    try {
      const { error } = await supabase
        .from("lobbies")
        .update({ [field]: value })
        .eq("id", lobby.id);

      if (error) throw error;
    } catch (err: any) {
      console.error("Update settings error:", err);
    }
  };

  // Start Game (Host only)
  const handleStartGame = async () => {
    if (!isHost || !lobby) return;

    try {
      // Tüm oyuncular ready mi kontrol et (host hariç)
      const nonHostPlayers = players.filter(p => p.user_id !== lobby.host_id);
      const allReady = nonHostPlayers.every(p => p.is_ready);

      if (!allReady && nonHostPlayers.length > 0) {
        alert("Tüm oyuncular hazır olmalı!");
        return;
      }

      if (players.length < 2) {
        alert("En az 2 oyuncu olmalı!");
        return;
      }

      // Rastgele karakter seç (arc limit dahilinde)
      const { data: characters, error: charError } = await supabase
        .from("characters")
        .select("id")
        .eq("is_active", true)
        .lte("debut_arc_index", lobby.arc_limit);

      if (charError || !characters || characters.length === 0) {
        throw new Error("Karakter bulunamadı");
      }

      const randomChar = characters[Math.floor(Math.random() * characters.length)];

      // Lobi durumunu güncelle
      const { error: lobbyError } = await supabase
        .from("lobbies")
        .update({
          status: "in_progress",
          current_round: 1,
        })
        .eq("id", lobby.id);

      if (lobbyError) throw lobbyError;

      // İlk round'u oluştur
      const { error: roundError } = await supabase
        .from("multi_rounds")
        .insert({
          lobby_id: lobby.id,
          round_number: 1,
          character_id: randomChar.id,
          started_at: new Date().toISOString(),
          environment: process.env.NODE_ENV === "production" ? "prod" : "dev",
        });

      if (roundError) throw roundError;

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Game started!");
      }

      // Oyun sayfasına yönlendir (realtime subscription zaten yapacak)
    } catch (err: any) {
      console.error("Start game error:", err);
      alert("Oyun başlatılamadı: " + err.message);
    }
  };

  // Leave Lobby
  const handleLeaveLobby = async () => {
    if (!user || !lobby) return;

    try {
      if (isHost) {
        // Host ayrılırsa lobi iptal
        const { error } = await supabase
          .from("lobbies")
          .update({ status: "cancelled" })
          .eq("id", lobby.id);

        if (error) throw error;
      } else {
        // Normal oyuncu ayrılır
        const { error } = await supabase
          .from("lobby_players")
          .delete()
          .eq("lobby_id", lobby.id)
          .eq("user_id", user.id);

        if (error) throw error;
      }

      router.push("/multiplayer");
    } catch (err: any) {
      console.error("Leave lobby error:", err);
      alert("Lobiden ayrılınamadı");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2EBE2]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013220] mx-auto"></div>
          <p className="text-[#855E42] font-medium">Lobi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !lobby) {
    return (
      <div className="min-h-screen bg-[#F2EBE2] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white border-2 border-red-200 rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="text-center space-y-4">
              <XCircle className="w-12 h-12 text-red-600 mx-auto" />
              <h2 className="text-2xl font-bold text-[#013220]">
                Hata
              </h2>
              <p className="text-red-700">{error || "Lobi bulunamadı"}</p>
              <Button 
                onClick={() => router.push("/multiplayer")} 
                className="mt-4 bg-[#F2EBE2] text-[#013220] border-2 border-[#013220] hover:bg-[#013220] hover:text-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl px-6 py-6"
              >
                Geri Dön
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F2EBE2] px-4 py-6 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-4xl font-bold text-[#013220] mb-3">Lobi Bekleme Odası</h1>
          <div className="inline-block bg-[#013220] text-[#F2EBE2] px-6 md:px-8 py-3 md:py-4 rounded-2xl text-2xl md:text-3xl font-mono font-bold tracking-widest shadow-xl border-2 border-[#855E42]/30">
            {lobby.code}
          </div>
          <p className="text-[#855E42] font-medium mt-4 text-sm md:text-base">
            Bu kodu arkadaşlarınla paylaş
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4 md:gap-6">
          {/* Players List */}
          <div className="bg-white border-2 border-[#013220]/20 rounded-2xl p-4 md:p-6 shadow-xl">
            <h2 className="text-xl md:text-2xl font-bold text-[#013220] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 md:w-6 md:h-6" />
              <span>Oyuncular ({players.length}/{lobby.max_players})</span>
            </h2>
            <div className="space-y-2 md:space-y-3 mb-4">
              {players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 bg-[#F2EBE2]/50 border border-[#013220]/10 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    {avatarUrls.has(player.user_id) ? (
                      <img
                        src={avatarUrls.get(player.user_id)}
                        alt={player.profiles?.username || "Player"}
                        className="w-10 h-10 rounded-full object-cover border-2 border-[#013220]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-[#013220] flex items-center justify-center text-[#F2EBE2] font-bold">
                        {player.profiles?.username?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[#013220] flex items-center gap-2">
                        {player.profiles?.username || "Unknown"}
                        {player.user_id === lobby.host_id && (
                          <span className="text-xs bg-[#855E42] text-[#F2EBE2] px-2 py-1 rounded-lg flex items-center gap-1">
                            <Crown className="w-3 h-3" />
                            HOST
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div>
                    {player.user_id === lobby.host_id || player.is_ready ? (
                      <CheckCircle2 className="w-5 h-5 text-[#013220]" />
                    ) : (
                      <XCircle className="w-5 h-5 text-[#855E42]" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Ready Button */}
            {!isHost && currentPlayer && (
              <Button
                onClick={handleToggleReady}
                className={`w-full mt-4 rounded-xl py-6 font-semibold transition-all duration-200 ${
                  currentPlayer.is_ready
                    ? "bg-[#855E42]/20 text-[#855E42] border-2 border-[#855E42]/30"
                    : "bg-[#013220] text-[#F2EBE2] hover:bg-[#013220]/90 border-2 border-[#013220]"
                }`}
                size="lg"
              >
                {currentPlayer.is_ready ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>Hazırım</span>
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <XCircle className="w-5 h-5" />
                    <span>Hazır Ol</span>
                  </span>
                )}
              </Button>
            )}
          </div>

          {/* Settings */}
          <div className="bg-white border-2 border-[#855E42]/30 rounded-2xl p-4 md:p-6 shadow-xl">
            <h2 className="text-xl md:text-2xl font-bold text-[#013220] mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 md:w-6 md:h-6" />
              <span>Oyun Ayarları</span>
            </h2>
            <div className="space-y-4 md:space-y-6">
              {/* Round Count */}
              <div className="space-y-2">
                <Label className="text-[#013220] font-semibold text-base">Round Sayısı</Label>
                <div className="flex gap-2">
                  {[3, 5, 7].map((count) => (
                    <Button
                      key={count}
                      onClick={() => handleUpdateSettings("max_rounds", count)}
                      disabled={!isHost}
                      className={`flex-1 rounded-xl py-4 font-semibold transition-all duration-200 ${
                        lobby.max_rounds === count
                          ? "bg-[#013220] text-[#F2EBE2] border-2 border-[#013220]"
                          : "bg-[#F2EBE2] text-[#013220] border-2 border-[#013220]/30 hover:border-[#013220]"
                      } disabled:opacity-50`}
                    >
                      {count}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Arc Limit */}
              <div className="space-y-2">
                <Label htmlFor="arc-limit" className="text-[#013220] font-semibold text-base">
                  Arc Limiti
                </Label>
                <select
                  id="arc-limit"
                  value={lobby.arc_limit}
                  onChange={(e) => handleUpdateSettings("arc_limit", Number(e.target.value))}
                  disabled={!isHost}
                  className="w-full p-3 border-2 border-[#855E42]/30 focus:border-[#013220] focus:ring-[#013220] focus:ring-2 rounded-xl bg-white text-[#013220] font-medium disabled:opacity-50"
                >
                  {ARC_LIST.map((arcName, index) => (
                    <option key={index} value={index}>
                      {arcName} {index === 30 ? "(Tüm Karakterler)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Info */}
              <div className="p-4 bg-[#855E42]/10 border-2 border-[#855E42]/20 rounded-xl">
                <p className="font-semibold mb-2 text-[#013220]">Puanlama:</p>
                <ul className="space-y-1 text-sm text-[#855E42]">
                  <li>• Başlangıç: 100 puan</li>
                  <li>• Yanlış tahmin: -2 puan</li>
                  <li>• İpucu: -5 puan</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 md:mt-8 flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
          {isHost && (
            <Button
              onClick={handleStartGame}
              size="lg"
              disabled={players.length < 2}
              className="bg-[#013220] text-[#F2EBE2] hover:bg-[#013220]/90 border-2 border-[#013220] transition-all duration-200 font-semibold rounded-xl px-8 py-6 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className="w-5 h-5" />
              <span>Oyunu Başlat</span>
            </Button>
          )}

          <Button
            onClick={handleLeaveLobby}
            size="lg"
            className="bg-[#855E42] text-[#F2EBE2] hover:bg-[#855E42]/90 border-2 border-[#855E42] transition-all duration-200 font-semibold rounded-xl px-8 py-6 flex items-center justify-center gap-2"
          >
            <LogOut className="w-5 h-5" />
            <span>{isHost ? "Lobi İptal Et" : "Lobiden Ayrıl"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

