"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Trophy, Crown } from "lucide-react";

interface Player {
  id: number;
  user_id: string;
  score_total: number;
  rounds_won: number;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface Lobby {
  id: number;
  code: string;
  max_rounds: number;
}

export default function MultiplayerResultsPage() {
  const router = useRouter();
  const params = useParams();
  const supabase = createClient();
  const { user } = useAuth();

  const lobbyCode = params.code as string;

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsUpdated, setStatsUpdated] = useState(false);
  const [avatarUrls, setAvatarUrls] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!lobbyCode || !user) return;

    // Avatar URL yükleme fonksiyonu (useEffect içinde tanımlanmalı)
    const loadAvatarUrl = async (userId: string, avatarUrl: string | null) => {
      if (!avatarUrl) return;

      // Functional update ile mevcut state'i kontrol et
      setAvatarUrls(prev => {
        // Eğer zaten yüklenmişse, hiçbir şey yapma
        if (prev.has(userId)) {
          return prev;
        }
        
        // Async işlemi başlat
        (async () => {
          try {
            const fileName = avatarUrl.startsWith("character-images/")
              ? avatarUrl.replace("character-images/", "")
              : avatarUrl;

            const { data: signedData, error: signedError } = await supabase
              .storage
              .from("character-images")
              .createSignedUrl(fileName, 31536000);

            if (!signedError && signedData) {
              setAvatarUrls(prevMap => {
                const newMap = new Map(prevMap);
                if (!newMap.has(userId)) {
                  newMap.set(userId, signedData.signedUrl);
                }
                return newMap;
              });
            }
          } catch (err) {
            console.error("Failed to get avatar signed URL:", err);
          }
        })();
        
        return prev;
      });
    };

    const loadResults = async () => {
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

        // Oyuncuları çek ve sırala
        const { data: playersData, error: playersError } = await supabase
          .from("lobby_players")
          .select("*")
          .eq("lobby_id", lobbyData.id)
          .order("score_total", { ascending: false });

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

        if (process.env.NODE_ENV === "development") {
          console.log("🏆 Results loaded");
        }
      } catch (err: any) {
        console.error("Load results error:", err);
        setError(err.message || "Sonuçlar yüklenemedi");
      } finally {
        setLoading(false);
      }
    };

    loadResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobbyCode, user, supabase]);

  // Stats güncelleme (sadece bir kere)
  useEffect(() => {
    if (!players.length || statsUpdated || !user) return;

    const updateStats = async () => {
      try {
        // En yüksek skoru bul
        const maxScore = Math.max(...players.map(p => p.score_total));
        const winners = players.filter(p => p.score_total === maxScore);

        // Her oyuncu için stats güncelle
        for (const player of players) {
          const isWinner = winners.some(w => w.user_id === player.user_id);

          // Mevcut stats'ı çek (single yerine maybeSingle kullan)
          const { data: currentStats, error: fetchError } = await supabase
            .from("user_stats")
            .select("*")
            .eq("user_id", player.user_id)
            .maybeSingle();

          if (fetchError) {
            console.error("Fetch stats error for", player.user_id, fetchError);
            continue;
          }

          // Eğer stats yoksa, oluştur (upsert kullanarak güvenli insert)
          if (!currentStats) {
            // Önce insert dene, eğer zaten varsa (race condition) update yap
            const { error: insertError } = await supabase
              .from("user_stats")
              .insert({
                user_id: player.user_id,
                single_games_played: 0,
                single_avg_score: 0,
                multi_games_played: 0,
                multi_games_won: 0,
                multi_rounds_won: 0,
              });

            // Eğer insert hatası varsa (muhtemelen zaten var), tekrar çek ve update yap
            if (insertError) {
              // Zaten var olabilir, tekrar çek
              const { data: existingStats } = await supabase
                .from("user_stats")
                .select("*")
                .eq("user_id", player.user_id)
                .maybeSingle();

              if (existingStats) {
                // Varsa update yap
                const newGamesPlayed = (existingStats.multi_games_played || 0) + 1;
                const newGamesWon = (existingStats.multi_games_won || 0) + (isWinner ? 1 : 0);
                const newRoundsWon = (existingStats.multi_rounds_won || 0) + player.rounds_won;

                const { error: updateError } = await supabase
                  .from("user_stats")
                  .update({
                    multi_games_played: newGamesPlayed,
                    multi_games_won: newGamesWon,
                    multi_rounds_won: newRoundsWon,
                  })
                  .eq("user_id", player.user_id);

                if (updateError) {
                  console.error("Update stats error for", player.user_id, updateError);
                }
              }
            } else {
              // Insert başarılı, şimdi update yap
              const { error: updateError } = await supabase
                .from("user_stats")
                .update({
                  multi_games_played: 1,
                  multi_games_won: isWinner ? 1 : 0,
                  multi_rounds_won: player.rounds_won,
                })
                .eq("user_id", player.user_id);

              if (updateError) {
                console.error("Update stats error for", player.user_id, updateError);
              }
            }
            continue;
          }

          // Yeni değerleri hesapla
          const newGamesPlayed = (currentStats?.multi_games_played || 0) + 1;
          const newGamesWon = (currentStats?.multi_games_won || 0) + (isWinner ? 1 : 0);
          const newRoundsWon = (currentStats?.multi_rounds_won || 0) + player.rounds_won;

          // Stats'ı güncelle
          const { error: updateError } = await supabase
            .from("user_stats")
            .update({
              multi_games_played: newGamesPlayed,
              multi_games_won: newGamesWon,
              multi_rounds_won: newRoundsWon,
            })
            .eq("user_id", player.user_id);

          if (updateError) {
            console.error("Update stats error for", player.user_id, updateError);
          } else {
            if (process.env.NODE_ENV === "development") {
              console.log("✅ Stats updated for", player.profiles?.username);
            }
          }
        }

        setStatsUpdated(true);
      } catch (err: any) {
        console.error("Update stats error:", err);
      }
    };

    updateStats();
  }, [players, statsUpdated, user, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2EBE2]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013220] mx-auto"></div>
          <p className="text-[#855E42] font-semibold">Sonuçlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !lobby) {
    return (
      <div className="min-h-screen bg-[#F2EBE2] px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 bg-white border-2 border-red-500 rounded-2xl">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Hata</h2>
            <p className="text-red-700">{error || "Sonuçlar bulunamadı"}</p>
          </Card>
        </div>
      </div>
    );
  }

  const winner = players[0];
  const maxScore = winner?.score_total || 0;
  const winners = players.filter(p => p.score_total === maxScore);

  return (
    <div className="min-h-screen bg-[#F2EBE2] px-4 py-6 md:py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Trophy className="w-8 h-8 md:w-12 md:h-12 text-[#013220]" />
            <h1 className="text-3xl md:text-5xl font-bold text-[#013220]">Oyun Bitti!</h1>
          </div>
          <p className="text-lg md:text-xl text-[#855E42] font-semibold">
            {lobby.max_rounds} Round Tamamlandı
          </p>
        </div>

        {/* Winner Announcement */}
        <Card className="p-6 md:p-8 mb-6 md:mb-8 bg-gradient-to-r from-[#013220] to-[#013220]/90 border-2 border-[#855E42] rounded-2xl shadow-xl">
          <div className="text-center">
            <div className="flex justify-center items-center gap-3 mb-4">
              <Crown className="w-10 h-10 md:w-16 md:h-16 text-[#F2EBE2]" />
              {winners.length === 1 && winners[0] && (
                avatarUrls.has(winners[0].user_id) ? (
                  <img
                    src={avatarUrls.get(winners[0].user_id)}
                    alt={winners[0].profiles?.username || "Winner"}
                    className="w-16 h-16 md:w-24 md:h-24 rounded-full object-cover border-4 border-[#F2EBE2] shadow-lg"
                  />
                ) : (
                  <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#855E42] flex items-center justify-center text-[#F2EBE2] font-bold text-2xl md:text-3xl border-4 border-[#F2EBE2] shadow-lg">
                    {winners[0].profiles?.username?.[0]?.toUpperCase() || "?"}
                  </div>
                )
              )}
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#F2EBE2] mb-3">
              {winners.length === 1 ? "Kazanan" : "Kazananlar"}
            </h2>
            <div className="space-y-2">
              {winners.map((w) => (
                <p key={w.id} className="text-xl md:text-2xl font-semibold text-[#F2EBE2]">
                  {w.profiles?.username || "Unknown"}
                </p>
              ))}
            </div>
            <p className="text-3xl md:text-4xl font-bold text-[#F2EBE2] mt-4">
              {maxScore} Puan
            </p>
          </div>
        </Card>

        {/* Leaderboard */}
        <Card className="p-6 md:p-8 mb-6 md:mb-8 bg-white border-2 border-[#013220] rounded-2xl shadow-xl">
          <h2 className="text-xl md:text-2xl font-bold mb-6 text-center text-[#013220]">Final Sıralaması</h2>
          <div className="space-y-3">
            {players.map((player, index) => {
              const isWinner = player.score_total === maxScore;
              return (
                <div
                  key={player.id}
                  className={`p-4 rounded-xl flex items-center justify-between transition-all ${
                    isWinner
                      ? "bg-[#013220] text-[#F2EBE2] border-2 border-[#855E42] shadow-lg"
                      : "bg-[#F2EBE2]/50 border-2 border-[#013220]/20 text-[#855E42]"
                  }`}
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={`text-xl md:text-3xl font-bold ${
                      isWinner ? "text-[#F2EBE2]" : "text-[#855E42]"
                    } w-10 md:w-12 text-center`}>
                      #{index + 1}
                    </div>
                    {avatarUrls.has(player.user_id) ? (
                      <img
                        src={avatarUrls.get(player.user_id)}
                        alt={player.profiles?.username || "Player"}
                        className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover border-2 border-[#013220]/20"
                      />
                    ) : (
                      <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold ${
                        isWinner ? "bg-[#855E42] text-[#F2EBE2]" : "bg-[#013220] text-[#F2EBE2]"
                      }`}>
                        {player.profiles?.username?.[0]?.toUpperCase() || "?"}
                      </div>
                    )}
                    <div>
                      <p className={`font-semibold text-base md:text-xl ${
                        isWinner ? "text-[#F2EBE2]" : "text-[#013220]"
                      }`}>
                        {player.profiles?.username || "Unknown"}
                        {isWinner && <Crown className="w-5 h-5 inline-block ml-2" />}
                      </p>
                      <p className={`text-xs md:text-sm ${
                        isWinner ? "text-[#F2EBE2]/80" : "text-[#855E42]"
                      }`}>
                        {player.rounds_won} Round Kazandı
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl md:text-3xl font-bold ${
                      isWinner ? "text-[#F2EBE2]" : "text-[#013220]"
                    }`}>
                      {player.score_total}
                    </p>
                    <p className={`text-xs ${
                      isWinner ? "text-[#F2EBE2]/80" : "text-[#855E42]"
                    }`}>
                      Toplam Puan
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Stats Info */}
        {statsUpdated && (
          <div className="mb-6 md:mb-8 p-4 bg-[#013220]/10 border-2 border-[#013220]/20 rounded-xl text-center">
            <p className="text-[#013220] font-semibold">
              ✅ İstatistikleriniz güncellendi!
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={() => router.push("/multiplayer")}
            size="lg"
            className="bg-[#F2EBE2] text-[#013220] border-2 border-[#013220] hover:bg-[#013220] hover:text-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl px-8 py-6"
          >
            Yeni Oyun
          </Button>
          <Button
            onClick={() => router.push("/profile")}
            size="lg"
            className="bg-white text-[#013220] border-2 border-[#855E42] hover:bg-[#855E42] hover:text-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl px-8 py-6"
          >
            Profilim
          </Button>
        </div>
      </div>
    </div>
  );
}

