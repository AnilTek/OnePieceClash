"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Lightbulb, Tv, Users, Trophy, CheckCircle2, Clock, Crown } from "lucide-react";

interface Character {
  id: number;
  name: string;
  image_path: string | null;
  gender: string | null;
  age: number | null;
  devil_fruit: string | null;
  last_bounty: number | null;
  debut_arc: string | null;
  debut_arc_index: number;
  haki: string | null;
  affiliation: string | null;
  episode: string | null;
}

interface HintData {
  gender: "match" | "mismatch";
  affiliation: "match" | "mismatch";
  devil_fruit: "match" | "mismatch";
  haki: "match" | "mismatch";
  bounty: "higher" | "lower" | "equal";
  age: "higher" | "lower" | "equal";
  arc: "earlier" | "later" | "same";
}

interface Guess {
  character: Character;
  isCorrect: boolean;
  hintData: HintData;
}

interface Lobby {
  id: number;
  code: string;
  host_id: string;
  status: string;
  max_rounds: number;
  arc_limit: number;
  current_round: number;
}

interface Round {
  id: number;
  round_number: number;
  character_id: number;
  started_at?: string | null;
  ended_at?: string | null;
}

interface Player {
  id: number;
  user_id: string;
  score_total: number;
  rounds_won: number;
  is_ready: boolean;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
}

interface PlayerGuess {
  player_id: number;
  user_id: string;
  is_correct: boolean;
  score: number;
}

interface RoundResult {
  username: string;
  score: number;
  isWinner: boolean;
}

export default function MultiplayerGamePage() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const supabase = createClient();
  const { user } = useAuth();

  // URL'den direkt code'u oku (Vercel'de useParams() bug'lı)
  const getLobbyCodeFromUrl = (): string | null => {
    // Pathname: /multiplayer/game/J9N3XZ
    const match = pathname?.match(/\/multiplayer\/game\/([A-Z0-9]+)/);
    if (match && match[1]) {
      return match[1];
    }
    // Fallback: useParams() kullan (development için)
    const codeFromParams = params.code as string;
    if (codeFromParams && !codeFromParams.includes('drp:')) {
      return codeFromParams;
    }
    return null;
  };

  const lobbyCode = getLobbyCodeFromUrl();

  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [targetCharacter, setTargetCharacter] = useState<Character | null>(null);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerGuesses, setPlayerGuesses] = useState<PlayerGuess[]>([]);
  
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasFinished, setHasFinished] = useState(false);
  const [myScore, setMyScore] = useState(100);
  
  // Hint states
  const [hint1Revealed, setHint1Revealed] = useState(false);
  const [hint2Revealed, setHint2Revealed] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [characterImageUrls, setCharacterImageUrls] = useState<Map<number, string>>(new Map());
  const [avatarUrls, setAvatarUrls] = useState<Map<string, string>>(new Map());
  
  // Round end states
  const [showRoundEnd, setShowRoundEnd] = useState(false);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [isProcessingRound, setIsProcessingRound] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPlayer = players.find(p => p.user_id === user?.id);
  const isHost = lobby && user && lobby.host_id === user.id;

  // Initial load
  useEffect(() => {
    if (!lobbyCode || !user) return;

    const loadGame = async () => {
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

        // Eğer oyun bitmişse
        if (lobbyData.status === "finished") {
          router.push(`/multiplayer/results/${lobbyCode}`);
          return;
        }

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

        // Mevcut round'u çek
        const { data: roundData, error: roundError } = await supabase
          .from("multi_rounds")
          .select("*")
          .eq("lobby_id", lobbyData.id)
          .eq("round_number", lobbyData.current_round)
          .single();

        if (roundError) throw roundError;
        setCurrentRound(roundData);

        // Hedef karakteri çek
        const { data: charData, error: charError } = await supabase
          .from("characters")
          .select("*")
          .eq("id", roundData.character_id)
          .single();

        if (charError) throw charError;
        setTargetCharacter(charData);

        // Tüm karakterleri çek (arc limit dahilinde)
        const { data: allChars, error: allError } = await supabase
          .from("characters")
          .select("*")
          .eq("is_active", true)
          .lte("debut_arc_index", lobbyData.arc_limit)
          .order("name", { ascending: true });

        if (allError) throw allError;
        setAllCharacters(allChars || []);

        // Bu round'daki tahminleri çek
        const { data: guessesData } = await supabase
          .from("multi_guesses")
          .select("player_id, user_id, is_correct, score")
          .eq("round_id", roundData.id);

        setPlayerGuesses(guessesData || []);

        // Eğer bu kullanıcı zaten tahmin yaptıysa
        const myGuess = guessesData?.find(g => g.user_id === user.id);
        if (myGuess) {
          setHasFinished(true);
          setMyScore(myGuess.score);
        }

        if (process.env.NODE_ENV === "development") {
          console.log("🎮 Game loaded - Round", lobbyData.current_round);
        }
      } catch (err: any) {
        console.error("Load game error:", err);
        setError(err.message || "Oyun yüklenemedi");
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, [lobbyCode, user, supabase, router]);

  // Reveal function (easter egg for developer)
  useEffect(() => {
    // @ts-ignore
    window.reveal = (passcode: number) => {
      if (passcode === 1259) {
        if (targetCharacter) {
          console.log("🎯 Hedef Karakter:", targetCharacter.name);
          console.log("📋 Detaylar:", {
            id: targetCharacter.id,
            name: targetCharacter.name,
            gender: targetCharacter.gender,
            age: targetCharacter.age,
            devil_fruit: targetCharacter.devil_fruit,
            last_bounty: targetCharacter.last_bounty,
            debut_arc: targetCharacter.debut_arc,
            debut_arc_index: targetCharacter.debut_arc_index,
            haki: targetCharacter.haki,
            affiliation: targetCharacter.affiliation,
            episode: targetCharacter.episode,
          });
          if (currentRound) {
            console.log("🎮 Round Bilgisi:", {
              round_id: currentRound.id,
              round_number: currentRound.round_number,
              started_at: currentRound.started_at,
              ended_at: currentRound.ended_at,
            });
          }
        } else {
          console.log("❌ Henüz round başlamadı veya karakter seçilmedi.");
        }
      } else {
        console.log("❌ Geçersiz passcode.");
      }
    };

    return () => {
      // @ts-ignore
      delete window.reveal;
    };
  }, [targetCharacter, currentRound]);

  // Realtime subscriptions
  useEffect(() => {
    if (!lobby || !currentRound) return;

    const channel = supabase.channel(`game:${lobby.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'lobbies',
          filter: `id=eq.${lobby.id}`
        },
        (payload) => {
          const newLobby = payload.new as Lobby;
          setLobby(newLobby);

          // Oyun bittiyse
          if (newLobby.status === 'finished') {
            router.push(`/multiplayer/results/${lobbyCode}`);
          }

          // Round değiştiyse
          if (newLobby.current_round !== lobby.current_round) {
            window.location.reload(); // Yeni round için sayfayı yenile
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'multi_guesses',
          filter: `round_id=eq.${currentRound.id}`
        },
        async () => {
          // Yeni tahmin geldi, listeyi güncelle
          const { data: guessesData } = await supabase
            .from("multi_guesses")
            .select("player_id, user_id, is_correct, score")
            .eq("round_id", currentRound.id);

          setPlayerGuesses(guessesData || []);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'multi_rounds',
          filter: `id=eq.${currentRound.id}`
        },
        async (payload) => {
          const updatedRound = payload.new as Round & { ended_at?: string };
          
          // Round bittiyse
          if (updatedRound.ended_at && !showRoundEnd) {
            await showRoundEndScreen();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'lobby_players',
          filter: `lobby_id=eq.${lobby.id}`
        },
        async () => {
          // Oyuncu skorları güncellendi, listeyi yeniden yükle
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

            const playersWithProfiles = playersData.map(player => ({
              ...player,
              profiles: profilesData?.find(p => p.id === player.user_id),
            }));

            setPlayers(playersWithProfiles || []);
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [lobby, currentRound, supabase, lobbyCode, router, showRoundEnd]);

  // Check if round should end
  useEffect(() => {
    if (!lobby || !currentRound || !players.length || isProcessingRound || showRoundEnd) return;

    const checkRoundEnd = async () => {
      // Tüm oyuncular tahmin yaptı mı?
      if (playerGuesses.length === players.length) {
        setIsProcessingRound(true);
        
        // Önce round'un zaten bitip bitmediğini kontrol et
        const { data: roundCheck, error: checkError } = await supabase
          .from("multi_rounds")
          .select("ended_at")
          .eq("id", currentRound.id)
          .single();

        if (checkError) {
          console.error("Error checking round:", checkError);
          setIsProcessingRound(false);
          return;
        }

        // Eğer round zaten bitmişse, sadece score güncellemesini yap (başka client zaten bitirmiş)
        const roundAlreadyEnded = roundCheck?.ended_at !== null;

        // Round'u bitir (sadece henüz bitmemişse)
        if (!roundAlreadyEnded) {
          // Önce round'u kontrol et, sonra update yap (406 hatasını önlemek için)
          const { error: roundError } = await supabase
            .from("multi_rounds")
            .update({ ended_at: new Date().toISOString() })
            .eq("id", currentRound.id)
            .is("ended_at", null); // Sadece ended_at null ise güncelle

          if (roundError) {
            // Daha detaylı hata loglama
            if (process.env.NODE_ENV === "development") {
              console.error("Error ending round:", {
                message: roundError.message,
                code: roundError.code,
                details: roundError.details,
                hint: roundError.hint,
                fullError: roundError
              });
            }
            // Hata olsa bile devam et, belki başka biri zaten bitirdi
            // Score güncellemesini yapmaya devam et
          } else {
            if (process.env.NODE_ENV === "development") {
              console.log("✅ Round ended successfully");
            }
          }
        } else {
          if (process.env.NODE_ENV === "development") {
            console.log("Round already ended by another player, continuing with score update");
          }
        }

        // En yüksek skoru bul
        const maxScore = Math.max(...playerGuesses.map(g => g.score));
        const winners = playerGuesses.filter(g => g.score === maxScore);
        
        // ÖNEMLİ: Berabere durumunda (birden fazla winner varsa) hiçbirine round kazandırma
        // Sadece tek bir winner varsa round kazandır
        const hasSingleWinner = winners.length === 1;

        // TÜM oyuncuların score_total'ini güncelle (herkes kendi round skorunu alır)
        // ÖNEMLİ: Database'den güncel değerleri çekerek race condition'ı önle
        // ÖNEMLİ: Her oyuncu için ayrı ayrı database'den çek ve güncelle
        for (const guess of playerGuesses) {
          const player = players.find(p => p.user_id === guess.user_id);
          if (!player) {
            console.error("Player not found for user_id:", guess.user_id);
            continue;
          }

          // Önce mevcut değerleri database'den çek (güncel değerler için)
          // ÖNEMLİ: Her seferinde database'den çek, state'ten değil!
          const { data: currentPlayer, error: fetchError } = await supabase
            .from("lobby_players")
            .select("rounds_won, score_total")
            .eq("id", player.id)
            .single();

          if (fetchError) {
            console.error("Error fetching player data for player_id:", player.id, fetchError);
            continue;
          }

          if (!currentPlayer) {
            console.error("Current player data is null for player_id:", player.id);
            continue;
          }

          // Round skorunu score_total'e ekle
          const newScoreTotal = currentPlayer.score_total + guess.score;
          
          // Eğer tek winner varsa ve bu oyuncu winner ise, rounds_won'u artır
          const isWinner = hasSingleWinner && winners[0].user_id === guess.user_id;
          const newRoundsWon = isWinner ? currentPlayer.rounds_won + 1 : currentPlayer.rounds_won;

          // Debug log (sadece development)
          if (process.env.NODE_ENV === "development") {
            console.log(`📊 Updating player ${player.id}:`, {
              old_score_total: currentPlayer.score_total,
              round_score: guess.score,
              new_score_total: newScoreTotal,
              old_rounds_won: currentPlayer.rounds_won,
              isWinner,
              new_rounds_won: newRoundsWon
            });
          }

          // Güncelle
          const { error: updateError } = await supabase
            .from("lobby_players")
            .update({
              rounds_won: newRoundsWon,
              score_total: newScoreTotal,
            })
            .eq("id", player.id);

          if (updateError) {
            console.error("Error updating player stats for player_id:", player.id, updateError);
          }
        }
        
        // Oyuncu listesini database'den yeniden yükle (güncel score_total ve rounds_won için)
        const { data: updatedPlayersData } = await supabase
          .from("lobby_players")
          .select("*")
          .eq("lobby_id", lobby.id);

        if (updatedPlayersData && updatedPlayersData.length > 0) {
          const userIds = updatedPlayersData.map(p => p.user_id);
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .in("id", userIds);

          const playersWithProfiles = updatedPlayersData.map(player => ({
            ...player,
            profiles: profilesData?.find(p => p.id === player.user_id),
          }));

          setPlayers(playersWithProfiles || []);
        }

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Round ended, winners:", winners.length);
        }

        // Round end ekranını göster
        await showRoundEndScreen();
      }
    };

    checkRoundEnd();
  }, [playerGuesses, players, lobby, currentRound, isProcessingRound, showRoundEnd, supabase]);

  // Show round end screen
  const showRoundEndScreen = async () => {
    if (!currentRound || !players.length) return;

    // Sonuçları hazırla
    const results: RoundResult[] = [];
    const maxScore = Math.max(...playerGuesses.map(g => g.score));

    for (const guess of playerGuesses) {
      const player = players.find(p => p.user_id === guess.user_id);
      if (player) {
        results.push({
          username: player.profiles?.username || "Unknown",
          score: guess.score,
          isWinner: guess.score === maxScore,
        });
      }
    }

    // Skora göre sırala
    results.sort((a, b) => b.score - a.score);

    setRoundResults(results);
    setShowRoundEnd(true);
  };

  // Next round
  const handleNextRound = async () => {
    if (!isHost || !lobby) return;

    try {
      // Oyun bitti mi kontrol et
      if (lobby.current_round >= lobby.max_rounds) {
        // Oyunu bitir
        const { error } = await supabase
          .from("lobbies")
          .update({ status: "finished" })
          .eq("id", lobby.id);

        if (error) throw error;

        if (process.env.NODE_ENV === "development") {
          console.log("🏁 Game finished!");
        }
        
        // Sonuç sayfasına yönlendir (realtime subscription zaten yapacak)
        return;
      }

      // Yeni round oluştur
      const nextRoundNumber = lobby.current_round + 1;

      // Rastgele karakter seç
      const { data: characters, error: charError } = await supabase
        .from("characters")
        .select("id")
        .eq("is_active", true)
        .lte("debut_arc_index", lobby.arc_limit);

      if (charError || !characters || characters.length === 0) {
        throw new Error("Karakter bulunamadı");
      }

      const randomChar = characters[Math.floor(Math.random() * characters.length)];

      // Yeni round'u oluştur
      const { error: roundError } = await supabase
        .from("multi_rounds")
        .insert({
          lobby_id: lobby.id,
          round_number: nextRoundNumber,
          character_id: randomChar.id,
          started_at: new Date().toISOString(),
          environment: process.env.NODE_ENV === "production" ? "prod" : "dev",
        });

      if (roundError) throw roundError;

      // Lobi'nin current_round'unu güncelle
      const { error: lobbyError } = await supabase
        .from("lobbies")
        .update({ current_round: nextRoundNumber })
        .eq("id", lobby.id);

      if (lobbyError) throw lobbyError;

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Next round started:", nextRoundNumber);
      }

      // Sayfa yenilenecek (realtime subscription)
    } catch (err: any) {
      console.error("Next round error:", err);
      alert("Sonraki round başlatılamadı: " + err.message);
    }
  };

  // Calculate hints
  const calculateHints = (guessed: Character, target: Character): HintData => {
    const guessedBounty = guessed.last_bounty || 0;
    const targetBounty = target.last_bounty || 0;
    const guessedAge = guessed.age || 0;
    const targetAge = target.age || 0;

    return {
      gender: guessed.gender === target.gender ? "match" : "mismatch",
      affiliation: guessed.affiliation === target.affiliation ? "match" : "mismatch",
      devil_fruit: guessed.devil_fruit === target.devil_fruit ? "match" : "mismatch",
      haki: guessed.haki === target.haki ? "match" : "mismatch",
      bounty:
        targetBounty > guessedBounty ? "higher" : targetBounty < guessedBounty ? "lower" : "equal",
      age:
        targetAge > guessedAge ? "higher" : targetAge < guessedAge ? "lower" : "equal",
      arc:
        target.debut_arc_index > guessed.debut_arc_index
          ? "later"
          : target.debut_arc_index < guessed.debut_arc_index
          ? "earlier"
          : "same",
    };
  };

  // Handle guess
  const handleGuess = async (character: Character) => {
    if (!targetCharacter || !currentRound || !currentPlayer || hasFinished) return;

    if (guesses.some((g) => g.character.id === character.id)) {
      return; // Duplicate karakter, sessizce ignore et
    }

    const isCorrect = character.id === targetCharacter.id;
    const hintData = calculateHints(character, targetCharacter);

    const newGuess: Guess = {
      character,
      isCorrect,
      hintData,
    };

    setGuesses([...guesses, newGuess]);
    setSearchTerm("");
    setShowDropdown(false);

    // Skor güncelle
    if (!isCorrect) {
      setMyScore(prev => prev - 2);
    }

    if (process.env.NODE_ENV === "development") {
      console.log("📝 Tahmin:", character.name, isCorrect ? "✅" : "❌");
    }

    if (isCorrect) {
      setHasFinished(true);
      
      // Final score hesapla
      const wrongGuesses = guesses.filter(g => !g.isCorrect).length;
      const finalScore = 100 - (wrongGuesses * 2) - (hintsUsed * 5);

      // DB'ye kaydet
      try {
        const { error } = await supabase
          .from("multi_guesses")
          .insert({
            round_id: currentRound.id,
            lobby_id: lobby!.id,
            player_id: currentPlayer.id,
            user_id: user!.id,
            guessed_character_id: character.id,
            is_correct: true,
            score: finalScore,
          });

        if (error) throw error;

        if (process.env.NODE_ENV === "development") {
          console.log("✅ Guess saved, score:", finalScore);
        }
      } catch (err: any) {
        console.error("Save guess error:", err);
      }
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Hint reveal
  const revealHint1 = () => {
    setHint1Revealed(true);
    setHintsUsed(prev => prev + 1);
    setMyScore(prev => prev - 5);
  };

  const revealHint2 = () => {
    setHint2Revealed(true);
    setHintsUsed(prev => prev + 1);
    setMyScore(prev => prev - 5);
  };

  // Search filter
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCharacters([]);
      setShowDropdown(false);
      return;
    }

    // Tahmin edilen karakterleri çıkar
    const guessedIds = new Set(guesses.map(g => g.character.id));
    const filtered = allCharacters.filter((char) =>
      char.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !guessedIds.has(char.id)
    );
    setFilteredCharacters(filtered.slice(0, 10));
    setShowDropdown(true);
  }, [searchTerm, allCharacters, guesses]);

  // Box style (CSS renkler ile, PNG kullanmıyoruz)
  const getBoxStyle = (hint: string) => {
    switch (hint) {
      case "match":
      case "equal":
      case "same":
        return {
          bgColor: "bg-[#013220]",
          text: "text-[#F2EBE2]",
          showArrow: false,
        };
      case "mismatch":
        return {
          bgColor: "bg-[#855E42]",
          text: "text-[#F2EBE2]",
          showArrow: false,
        };
      case "higher":
      case "later":
        return {
          bgColor: "bg-[#855E42]",
          text: "text-[#F2EBE2]",
          showArrow: true,
          arrowDirection: "up",
        };
      case "lower":
      case "earlier":
        return {
          bgColor: "bg-[#855E42]",
          text: "text-[#F2EBE2]",
          showArrow: true,
          arrowDirection: "down",
        };
      default:
        return {
          bgColor: "bg-gray-700 dark:bg-gray-800",
          text: "text-gray-100 dark:text-gray-200",
          showArrow: false,
        };
    }
  };

  // Haki emoji gösterimi
  const getHakiEmoji = (haki: string | null) => {
    if (!haki || haki === "X") return "X";
    
    const hakiLower = haki.toLowerCase();
    if (hakiLower === "all") return "💪👁️👑";
    if (hakiLower === "armobs") return "💪👁️";
    if (hakiLower === "arm") return "💪";
    if (hakiLower === "obs") return "👁️";
    
    return haki;
  };

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

  // Karakter resim URL'i al (optimize edilmiş: cache + preload)
  const loadCharacterImage = async (characterId: number, imagePath: string | null) => {
    if (!imagePath || characterImageUrls.has(characterId)) return;

    try {
      const fileName = imagePath.startsWith("character-images/")
        ? imagePath.replace("character-images/", "")
        : imagePath;

      // Cache kontrolü (localStorage)
      const cacheKey = `char_img_${characterId}`;
      try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const cachedData = JSON.parse(cached);
          // Cache 7 gün geçerli
          if (Date.now() - cachedData.timestamp < 7 * 24 * 60 * 60 * 1000) {
            setCharacterImageUrls(prev => new Map(prev).set(characterId, cachedData.url));
            // Preload image
            const img = new Image();
            img.src = cachedData.url;
            return;
          }
        }
      } catch (err) {
        // Cache okuma hatası, devam et
      }

      const { data: signedData, error: signedError } = await supabase
        .storage
        .from("character-images")
        .createSignedUrl(fileName, 31536000);

      if (!signedError && signedData) {
        setCharacterImageUrls(prev => new Map(prev).set(characterId, signedData.signedUrl));
        
        // Cache'e kaydet
        try {
          localStorage.setItem(cacheKey, JSON.stringify({
            url: signedData.signedUrl,
            timestamp: Date.now()
          }));
        } catch (err) {
          // Cache yazma hatası, devam et
        }
        
        // Preload image
        const img = new Image();
        img.src = signedData.signedUrl;
      }
    } catch (err) {
      console.error("Failed to get character image URL:", err);
    }
  };

  // Oyun yüklendiğinde tüm karakter görsellerini önceden yükle
  useEffect(() => {
    if (allCharacters.length === 0 || loading) return;

    const preloadAllCharacterImages = async () => {
      if (process.env.NODE_ENV === "development") {
        console.log(`🖼️ Preloading ${allCharacters.length} character images...`);
      }
      
      // Batch processing: 10'ar 10'ar yükle (çok fazla paralel istek yapmadan)
      const batchSize = 10;
      for (let i = 0; i < allCharacters.length; i += batchSize) {
        const batch = allCharacters.slice(i, i + batchSize);
        
        // Paralel yükleme (batch içinde)
        await Promise.all(
          batch.map(char => 
            loadCharacterImage(char.id, char.image_path)
          )
        );
        
        // Her batch arasında kısa bir bekleme (rate limiting için)
        if (i + batchSize < allCharacters.length) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
      
      if (process.env.NODE_ENV === "development") {
        console.log(`✅ All character images preloaded!`);
      }
    };

    preloadAllCharacterImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allCharacters.length, loading]); // allCharacters yüklendiğinde çalışır

  // Round End Modal
  if (showRoundEnd) {
    return (
      <div className="min-h-screen bg-[#F2EBE2] px-4 py-6 md:py-8">
        <div className="max-w-4xl mx-auto">
          <Card className="p-6 md:p-8 bg-white border-2 border-[#013220] rounded-2xl shadow-xl">
            <div className="text-center mb-6 md:mb-8">
              <h1 className="text-2xl md:text-4xl font-bold text-[#013220] mb-3">
                Round {lobby?.current_round} Sonuçları
              </h1>
              {targetCharacter && characterImageUrls.has(targetCharacter.id) ? (
                <div className="flex justify-center mb-4">
                  <img
                    src={characterImageUrls.get(targetCharacter.id)}
                    alt={targetCharacter.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover border-4 border-[#013220] shadow-lg"
                  />
                </div>
              ) : null}
              <p className="text-lg md:text-xl text-[#855E42] font-semibold mb-2">
                Karakter: <span className="text-[#013220] font-bold">{targetCharacter?.name}</span>
              </p>
            </div>

            <div className="space-y-3 mb-6 md:mb-8">
              {roundResults.map((result, index) => {
                const player = players.find(p => p.profiles?.username === result.username);
                return (
                  <div
                    key={index}
                    className={`p-4 rounded-xl flex items-center justify-between transition-all ${
                      result.isWinner
                        ? "bg-[#013220] text-[#F2EBE2] border-2 border-[#855E42] shadow-lg"
                        : "bg-[#F2EBE2]/50 border-2 border-[#013220]/20 text-[#855E42]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`text-xl md:text-2xl font-bold ${
                        result.isWinner ? "text-[#F2EBE2]" : "text-[#855E42]"
                      }`}>
                        #{index + 1}
                      </div>
                      {player && avatarUrls.has(player.user_id) ? (
                        <img
                          src={avatarUrls.get(player.user_id)}
                          alt={result.username}
                          className="w-10 h-10 rounded-full object-cover border-2 border-[#013220]/20"
                        />
                      ) : (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          result.isWinner ? "bg-[#855E42] text-[#F2EBE2]" : "bg-[#013220] text-[#F2EBE2]"
                        }`}>
                          {result.username[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <p className={`font-semibold text-base md:text-lg ${
                          result.isWinner ? "text-[#F2EBE2]" : "text-[#013220]"
                        }`}>
                          {result.username}
                          {result.isWinner && <Crown className="w-5 h-5 inline-block ml-2" />}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl md:text-2xl font-bold ${
                        result.isWinner ? "text-[#F2EBE2]" : "text-[#013220]"
                      }`}>
                        {result.score}
                      </p>
                      <p className={`text-xs ${
                        result.isWinner ? "text-[#F2EBE2]/80" : "text-[#855E42]"
                      }`}>
                        Puan
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {isHost && (
              <div className="text-center">
                <Button 
                  onClick={handleNextRound} 
                  size="lg" 
                  className="bg-[#F2EBE2] text-[#013220] border-2 border-[#013220] hover:bg-[#013220] hover:text-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl px-12 py-6"
                >
                  {lobby && lobby.current_round >= lobby.max_rounds
                    ? "Oyunu Bitir"
                    : "Sonraki Round"}
                </Button>
              </div>
            )}

            {!isHost && (
              <p className="text-center text-[#855E42] font-medium">
                Host sonraki round'u başlatacak...
              </p>
            )}
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F2EBE2]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013220] mx-auto"></div>
          <p className="text-[#855E42] font-medium">Oyun yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error || !lobby || !currentRound || !targetCharacter) {
    return (
      <div className="min-h-screen bg-[#F2EBE2] flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white border-2 border-red-200 rounded-2xl p-6 md:p-8 shadow-xl">
            <h2 className="text-2xl font-bold text-[#013220] mb-2">Hata</h2>
            <p className="text-red-700">{error || "Oyun bulunamadı"}</p>
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
          <h1 className="text-2xl md:text-3xl font-bold text-[#013220] mb-2">
            Round {lobby.current_round} / {lobby.max_rounds}
          </h1>
          <div className="mt-4 inline-block px-4 py-2 bg-[#013220] text-[#F2EBE2] rounded-xl text-lg md:text-xl font-bold">
            Skor: {myScore}
          </div>
        </div>

        {/* Players Status */}
        <div className="mb-6 flex flex-wrap gap-2 md:gap-3 justify-center">
          {players.map((player) => {
            const hasGuessed = playerGuesses.some(g => g.user_id === player.user_id);
            return (
              <div
                key={player.id}
                className={`px-3 md:px-4 py-2 rounded-xl flex items-center gap-2 text-sm md:text-base font-medium ${
                  hasGuessed
                    ? "bg-[#013220] text-[#F2EBE2]"
                    : "bg-white/50 border-2 border-[#013220]/20 text-[#855E42]"
                }`}
              >
                {avatarUrls.has(player.user_id) ? (
                  <img
                    src={avatarUrls.get(player.user_id)}
                    alt={player.profiles?.username || "Player"}
                    className="w-5 h-5 rounded-full object-cover border border-[#013220]/20"
                  />
                ) : (
                  <Users className="w-4 h-4" />
                )}
                <span>{player.profiles?.username || "Unknown"}</span>
                {hasGuessed ? (
                  <CheckCircle2 className="w-4 h-4 text-[#F2EBE2]" />
                ) : (
                  <Clock className="w-4 h-4 text-[#855E42]" />
                )}
              </div>
            );
          })}
        </div>

        {/* Hints */}
        {!hasFinished && (
          <div className="mb-6 flex flex-wrap gap-2 justify-center">
            {guesses.length >= 3 && (
              <Button
                onClick={revealHint1}
                disabled={hint1Revealed}
                className={
                  hint1Revealed
                    ? "bg-[#855E42]/20 text-[#855E42] border-2 border-[#855E42]/30 rounded-xl"
                    : "bg-[#013220] text-[#F2EBE2] hover:bg-[#013220]/90 border-2 border-[#013220] rounded-xl"
                }
                size="sm"
              >
                {hint1Revealed ? (
                  <span className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-xs md:text-sm">Meyve: {targetCharacter.devil_fruit || "X"}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-xs md:text-sm">İpucu 1 (-5)</span>
                  </span>
                )}
              </Button>
            )}
            
            {guesses.length >= 6 && (
              <Button
                onClick={revealHint2}
                disabled={hint2Revealed}
                className={
                  hint2Revealed
                    ? "bg-[#855E42]/20 text-[#855E42] border-2 border-[#855E42]/30 rounded-xl"
                    : "bg-[#013220] text-[#F2EBE2] hover:bg-[#013220]/90 border-2 border-[#013220] rounded-xl"
                }
                size="sm"
              >
                {hint2Revealed ? (
                  <span className="flex items-center gap-2">
                    <Tv className="w-4 h-4" />
                    <span className="text-xs md:text-sm">Episode: {targetCharacter.episode || "?"}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Tv className="w-4 h-4" />
                    <span className="text-xs md:text-sm">İpucu 2 (-5)</span>
                  </span>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Finished Message */}
        {hasFinished && (
          <div className="mb-6 bg-white border-2 border-[#013220] rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="text-center space-y-4">
              {targetCharacter && characterImageUrls.has(targetCharacter.id) ? (
                <div className="flex justify-center mb-2">
                  <img
                    src={characterImageUrls.get(targetCharacter.id)}
                    alt={targetCharacter.name}
                    className="w-32 h-32 md:w-40 md:h-40 rounded-2xl object-cover border-4 border-[#013220] shadow-xl"
                  />
                </div>
              ) : (
                <div className="text-5xl md:text-6xl mb-2">🎉</div>
              )}
              <h2 className="text-2xl md:text-3xl font-bold text-[#013220]">
                Doğru Bildiniz!
              </h2>
              <p className="text-xl md:text-2xl font-bold text-[#013220]">
                {targetCharacter.name}
              </p>
              <div className="mt-4 inline-block px-6 py-3 bg-[#013220] text-[#F2EBE2] rounded-xl">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5" />
                  <span className="text-lg md:text-xl font-bold">Skor: {myScore}</span>
                </div>
              </div>
              <p className="text-sm md:text-base text-[#855E42] mt-4 font-medium">
                Diğer oyuncuların bitirmesini bekliyorsunuz...
              </p>
            </div>
          </div>
        )}

        {/* Input */}
        {!hasFinished && (
          <div className="mb-6 relative">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Karakter adını yazın..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onFocus={() => searchTerm && setShowDropdown(true)}
                  className="w-full !bg-white border-2 border-[#855E42]/30 focus:border-[#013220] focus:ring-[#013220] focus:ring-2 text-[#013220] rounded-xl text-base md:text-lg py-6"
                  autoFocus
                />
                
                {showDropdown && filteredCharacters.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border-2 border-[#013220]/20 rounded-xl shadow-xl max-h-60 overflow-y-auto">
                    {filteredCharacters.map((char) => (
                      <button
                        key={char.id}
                        onClick={() => handleGuess(char)}
                        className="w-full px-4 py-3 text-left hover:bg-[#013220]/10 transition-colors text-[#013220] font-medium border-b border-[#013220]/5 last:border-0"
                      >
                        {char.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Guesses */}
        {guesses.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg md:text-xl font-bold text-[#013220] text-center">Tahminleriniz</h2>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {[...guesses].reverse().map((guess, index) => {
                const genderStyle = getBoxStyle(guess.hintData.gender);
                const affiliationStyle = getBoxStyle(guess.hintData.affiliation);
                const devilFruitStyle = getBoxStyle(guess.hintData.devil_fruit);
                const hakiStyle = getBoxStyle(guess.hintData.haki);
                const bountyStyle = getBoxStyle(guess.hintData.bounty);
                const ageStyle = getBoxStyle(guess.hintData.age);
                const arcStyle = getBoxStyle(guess.hintData.arc);

                return (
                  <div key={guesses.length - index} className="space-y-2">
                    <div className="text-sm text-gray-500">
                      Tahmin #{guesses.length - index}
                    </div>
                    
                    <div className="grid grid-cols-8 gap-2">
                      {/* Karakter İsmi/Resmi Kutusu */}
                      <div 
                        className={`p-3 rounded-lg aspect-square ${guess.isCorrect ? 'bg-[#013220]' : 'bg-[#855E42]'} text-[#F2EBE2] flex items-center justify-center text-center relative group overflow-hidden`}
                        onMouseEnter={() => {
                          if (guess.character.image_path) {
                            loadCharacterImage(guess.character.id, guess.character.image_path);
                          }
                        }}
                      >
                        {characterImageUrls.has(guess.character.id) && guess.character.image_path ? (
                          <img
                            src={characterImageUrls.get(guess.character.id)}
                            alt={guess.character.name}
                            className="w-full h-full object-cover absolute inset-0 opacity-100 group-hover:opacity-0 transition-opacity duration-300"
                          />
                        ) : null}
                        <div className="text-xs font-semibold break-words relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          {guess.character.name}
                        </div>
                      </div>

                      {/* Gender */}
                      <div 
                        className={`p-3 rounded-lg aspect-square ${genderStyle.bgColor} ${genderStyle.text} flex flex-col items-center justify-center relative flip-reveal`}
                        style={{ animationDelay: `0.25s` }}
                      >
                        <div className="text-xs font-semibold relative z-10">{guess.character.gender || "?"}</div>
                        <div className="text-xs opacity-75 relative z-10">Gender</div>
                      </div>

                      {/* Affiliation */}
                      <div 
                        className={`p-3 rounded-lg aspect-square ${affiliationStyle.bgColor} ${affiliationStyle.text} flex flex-col items-center justify-center relative flip-reveal`}
                        style={{ animationDelay: `0.5s` }}
                      >
                        <div className="text-xs font-semibold text-center break-words line-clamp-2 relative z-10">
                          {guess.character.affiliation || "?"}
                        </div>
                        <div className="text-xs opacity-75 relative z-10">Affiliation</div>
                      </div>

                      {/* Devil Fruit */}
                      <div 
                        className={`p-3 rounded-lg aspect-square ${devilFruitStyle.bgColor} ${devilFruitStyle.text} flex flex-col items-center justify-center relative flip-reveal`}
                        style={{ animationDelay: `0.75s` }}
                      >
                        <div className="text-xs font-semibold text-center break-words line-clamp-2 relative z-10">
                          {guess.character.devil_fruit || "X"}
                        </div>
                        <div className="text-xs opacity-75 relative z-10">Devil Fruit</div>
                      </div>

                      {/* Haki */}
                      <div 
                        className={`p-3 rounded-lg aspect-square ${hakiStyle.bgColor} ${hakiStyle.text} flex flex-col items-center justify-center relative flip-reveal`}
                        style={{ animationDelay: `1s` }}
                      >
                        <div className="text-lg mb-1 relative z-10">{getHakiEmoji(guess.character.haki)}</div>
                        <div className="text-xs opacity-75 relative z-10">Haki</div>
                      </div>

                      {/* Bounty */}
                      <div 
                        className={`p-3 rounded-lg aspect-square ${bountyStyle.bgColor} ${bountyStyle.text} flex flex-col items-center justify-center relative flip-reveal`}
                        style={{ animationDelay: `1.25s` }}
                      >
                        <div className="flex items-center gap-1">
                          {bountyStyle.showArrow && (
                            bountyStyle.arrowDirection === "up" ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )
                          )}
                          <div className="text-xs font-semibold relative z-10">
                            {guess.character.last_bounty 
                              ? `${(guess.character.last_bounty / 1000000).toFixed(0)}M`
                              : "0"}
                          </div>
                        </div>
                        <div className="text-xs opacity-75 relative z-10">Bounty</div>
                      </div>

                      {/* Age */}
                      <div 
                        className={`p-3 rounded-lg aspect-square ${ageStyle.bgColor} ${ageStyle.text} flex flex-col items-center justify-center relative flip-reveal`}
                        style={{ animationDelay: `1.5s` }}
                      >
                        <div className="flex items-center gap-1">
                          {ageStyle.showArrow && (
                            ageStyle.arrowDirection === "up" ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )
                          )}
                          <div className="text-xs font-semibold relative z-10">{guess.character.age || "0"}</div>
                        </div>
                        <div className="text-xs opacity-75 relative z-10">Age</div>
                      </div>

                      {/* Arc */}
                      <div 
                        className={`p-3 rounded-lg aspect-square ${arcStyle.bgColor} ${arcStyle.text} flex flex-col items-center justify-center relative flip-reveal`}
                        style={{ animationDelay: `1.75s` }}
                      >
                        <div className="flex items-center gap-1">
                          {arcStyle.showArrow && (
                            arcStyle.arrowDirection === "up" ? (
                              <ArrowUp className="w-4 h-4" />
                            ) : (
                              <ArrowDown className="w-4 h-4" />
                            )
                          )}
                          <div className="text-xs font-semibold text-center break-words line-clamp-2 relative z-10">
                            {guess.character.debut_arc || "?"}
                          </div>
                        </div>
                        <div className="text-xs opacity-75 relative z-10">Arc</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
