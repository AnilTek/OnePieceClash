"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/components/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ArrowUp, ArrowDown, Target, Play, Lightbulb, Tv } from "lucide-react";

// Arc Dictionary
const ARC_DICT: { [key: string]: number } = {
  'Romance Dawn': 0,
  'Orange Town': 1,
  'Syrup Village': 2,
  'Baratie': 3,
  'Arlong Park': 4,
  'Loguetown': 5,
  'Reverse Mountain': 6,
  'Whiskey Peak': 7,
  'Little Garden': 8,
  'Drum Island': 9,
  'Alabasta': 10,
  'Jaya': 11,
  'Skypiea': 12,
  'Long Ring Long Land': 13,
  'Water 7': 14,
  'Enies Lobby': 15,
  'Thriller Bark': 16,
  'Sabaody Archipelago': 17,
  'Amazon Lily': 18,
  'Impel Down': 19,
  'Marineford': 20,
  'Post-War': 21,
  'Return To Sabaody': 22,
  'Fishman Island': 23,
  'Punk Hazard': 24,
  'Dressrosa': 25,
  'Zou': 26,
  'Whole Cake Island': 27,
  'Reverie': 28,
  'Wano': 29,
  'Egghead': 30
};

const ARC_LIST = Object.keys(ARC_DICT);

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
  status: string | null;
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

export default function SingleClassicPage() {
  const supabase = createClient();
  const { user } = useAuth();
  
  // Game Setup States
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedArcIndex, setSelectedArcIndex] = useState<number>(30); // Default: Egghead (all arcs)
  
  // Game States
  const [targetCharacter, setTargetCharacter] = useState<Character | null>(null);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredCharacters, setFilteredCharacters] = useState<Character[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameWon, setGameWon] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gameStartTime] = useState<Date>(new Date());
  const [characterImageUrls, setCharacterImageUrls] = useState<Map<number, string>>(new Map());
  
  // Hint States
  const [hint1Revealed, setHint1Revealed] = useState(false);
  const [hint2Revealed, setHint2Revealed] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);

  // Oyunu başlat
  const handleStartGame = async () => {
    try {
      setLoading(true);
      setError(null);

      // Seçilen arc ve öncesi karakterleri çek
      const { data: filteredChars, error: filterError } = await supabase
        .from("characters")
        .select("*")
        .eq("is_active", true)
        .lte("debut_arc_index", selectedArcIndex)
        .order("id", { ascending: false })
        .limit(100);

      if (filterError) throw filterError;
      if (!filteredChars || filteredChars.length === 0) {
        throw new Error("Bu arc için aktif karakter bulunamadı");
      }

      // Rastgele hedef karakter seç
      const randomIndex = Math.floor(Math.random() * filteredChars.length);
      setTargetCharacter(filteredChars[randomIndex]);

      // Tüm karakterleri (arc limiti dahilinde) çek
      const { data: allChars, error: allError } = await supabase
        .from("characters")
        .select("*")
        .eq("is_active", true)
        .lte("debut_arc_index", selectedArcIndex)
        .order("name", { ascending: true });

      if (allError) throw allError;
      setAllCharacters(allChars || []);

      if (process.env.NODE_ENV === "development") {
        console.log("🎯 Hedef karakter:", filteredChars[randomIndex].name);
        console.log("📚 Arc limit:", ARC_LIST[selectedArcIndex]);
      }
      
      setGameStarted(true);
    } catch (err: any) {
      console.error("Game init error:", err);
      setError(err.message || "Oyun başlatılamadı");
    } finally {
      setLoading(false);
    }
  };

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
            status: targetCharacter.status,
          });
        } else {
          console.log("❌ Henüz oyun başlamadı veya karakter seçilmedi.");
        }
      } else {
        console.log("❌ Geçersiz passcode.");
      }
    };

    return () => {
      // @ts-ignore
      delete window.reveal;
    };
  }, [targetCharacter]);

  // Search filtreleme
  useEffect(() => {
    if (!gameStarted) return;
    
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
  }, [searchTerm, allCharacters, gameStarted, guesses]);

  // Hint hesaplama
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
        targetBounty > guessedBounty
          ? "higher"
          : targetBounty < guessedBounty
          ? "lower"
          : "equal",
      age:
        targetAge > guessedAge
          ? "higher"
          : targetAge < guessedAge
          ? "lower"
          : "equal",
      arc:
        target.debut_arc_index > guessed.debut_arc_index
          ? "later"
          : target.debut_arc_index < guessed.debut_arc_index
          ? "earlier"
          : "same",
    };
  };

  // Oyunu kaydet
  const saveGameToDatabase = async () => {
    if (!user || !targetCharacter || guesses.length === 0) return;

    setSaving(true);
    try {
      const gameEndTime = new Date();

      const { data: gameData, error: gameError } = await supabase
        .from("single_games")
        .insert({
          user_id: user.id,
          mode: "classic",
          character_id: targetCharacter.id,
          started_at: gameStartTime.toISOString(),
          ended_at: gameEndTime.toISOString(),
          final_score: 100,
          environment: process.env.NODE_ENV === "production" ? "prod" : "dev",
        })
        .select()
        .single();

      if (gameError) throw gameError;

      const guessInserts = guesses.map((guess) => ({
        game_id: gameData.id,
        user_id: user.id,
        guessed_character_id: guess.character.id,
        is_correct: guess.isCorrect,
        hint_data: guess.hintData,
      }));

      const { error: guessesError } = await supabase
        .from("single_guesses")
        .insert(guessInserts);

      if (guessesError) throw guessesError;

      if (process.env.NODE_ENV === "development") {
        console.log("✅ Game saved (Classic - no stats update)");
      }
    } catch (err: any) {
      console.error("❌ Save error:", err);
      alert("Oyun kaydedilemedi: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Tahmin yap
  const handleGuess = async (character: Character) => {
    if (!targetCharacter) return;

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

    const updatedGuesses = [...guesses, newGuess];
    setGuesses(updatedGuesses);
    setSearchTerm("");
    setShowDropdown(false);

    if (process.env.NODE_ENV === "development") {
      console.log("📝 Tahmin:", character.name, isCorrect ? "✅" : "❌");
    }

    if (isCorrect) {
      setGameWon(true);
      if (process.env.NODE_ENV === "development") {
        console.log("🎉 Oyun kazanıldı!");
      }
    }

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  // Oyun kazanıldığında kaydet
  useEffect(() => {
    if (gameWon && !saving) {
      saveGameToDatabase();
    }
  }, [gameWon]); // eslint-disable-line react-hooks/exhaustive-deps

  // Yeni oyun
  const handleNewGame = () => {
    window.location.reload();
  };

  // Kutu stili (CSS renkler ile, PNG kullanmıyoruz)
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

  // Oyun başladığında tüm karakter görsellerini önceden yükle
  useEffect(() => {
    if (!gameStarted || allCharacters.length === 0) return;

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
  }, [gameStarted, allCharacters.length]); // allCharacters.length değiştiğinde tekrar çalışır

  // Arc Selection Screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-[#F2EBE2] flex items-center justify-center px-4 py-8 md:py-12">
        <div className="w-full max-w-2xl mx-auto">
          <div className="bg-white border-2 border-[#013220]/20 rounded-2xl p-6 md:p-8 shadow-xl">
            <div className="space-y-6">
              <div className="text-center">
                <h1 className="text-3xl md:text-4xl font-bold text-[#013220] mb-2">Classic Mode</h1>
                <p className="text-base text-[#855E42] font-medium">
                  Oyun ayarlarını yapın ve başlayın
                </p>
              </div>

              {/* Arc Selection */}
              <div className="space-y-3">
                <Label htmlFor="arc-select" className="text-[#013220] font-semibold text-base flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Arc Limiti
                </Label>
                <p className="text-sm text-[#855E42]">
                  Seçtiğiniz arc ve öncesindeki karakterler oyunda olacak
                </p>
                <select
                  id="arc-select"
                  value={selectedArcIndex}
                  onChange={(e) => setSelectedArcIndex(Number(e.target.value))}
                  className="w-full p-3 border-2 border-[#855E42]/30 focus:border-[#013220] focus:ring-[#013220] focus:ring-2 rounded-xl bg-white text-[#013220] font-medium"
                >
                  {ARC_LIST.map((arcName, index) => (
                    <option key={index} value={index}>
                      {arcName} {index === 30 ? "(Tüm Karakterler)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              {error && (
                <div className="p-3 text-sm text-red-700 bg-red-50 border-2 border-red-200 rounded-xl">
                  {error}
                </div>
              )}

              <Button
                onClick={handleStartGame}
                disabled={loading}
                className="w-full bg-[#F2EBE2] text-[#013220] border-2 border-[#013220] hover:bg-[#013220] hover:text-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl py-6 flex items-center justify-center gap-2"
                size="lg"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#013220]"></div>
                    <span>Hazırlanıyor...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    <span>Oyunu Başlat</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400">Oyun hazırlanıyor...</p>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
            <h2 className="text-xl font-semibold text-red-600 dark:text-red-400 mb-2">
              Hata
            </h2>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </Card>
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="min-h-screen bg-[#F2EBE2] px-4 py-6 md:py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#013220] mb-2">Classic Mode</h1>
          <div className="flex items-center justify-center gap-3 md:gap-4 text-xs md:text-sm text-[#855E42] font-medium">
            <span className="px-3 py-1 bg-white/50 rounded-lg border border-[#013220]/10">
              Tahmin: <span className="font-bold text-[#013220]">{guesses.length}</span>
            </span>
            <span className="px-3 py-1 bg-white/50 rounded-lg border border-[#013220]/10">
              Arc: <span className="font-bold text-[#013220]">{ARC_LIST[selectedArcIndex]}</span>
            </span>
          </div>
        </div>

        {/* Hints */}
        {!gameWon && (
          <div className="mb-6 flex flex-wrap gap-2 justify-center">
            {/* Hint 1 - Devil Fruit Type */}
            {guesses.length >= 3 && (
              <Button
                onClick={() => setHint1Revealed(true)}
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
                    <span className="text-xs md:text-sm">Meyve: {targetCharacter?.devil_fruit || "X"}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    <span className="text-xs md:text-sm">İpucu 1</span>
                  </span>
                )}
              </Button>
            )}
            
            {/* Hint 2 - Episode */}
            {guesses.length >= 6 && (
              <Button
                onClick={() => setHint2Revealed(true)}
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
                    <span className="text-xs md:text-sm">Episode: {targetCharacter?.episode || "?"}</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Tv className="w-4 h-4" />
                    <span className="text-xs md:text-sm">İpucu 2</span>
                  </span>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Game Won */}
        {gameWon && (
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
                Tebrikler!
              </h2>
              <p className="text-base md:text-lg text-[#855E42] font-medium">
                Karakteri <span className="font-bold text-[#013220]">{guesses.length}</span> tahminde buldunuz
              </p>
              <p className="text-xl md:text-2xl font-bold text-[#013220]">
                {targetCharacter?.name}
              </p>
              {saving && (
                <div className="flex items-center justify-center gap-2 text-sm text-[#855E42]">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#013220]"></div>
                  <span>Oyun kaydediliyor...</span>
                </div>
              )}
              <Button 
                onClick={handleNewGame} 
                className="mt-4 bg-[#F2EBE2] text-[#013220] border-2 border-[#013220] hover:bg-[#013220] hover:text-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl px-6 py-6" 
                disabled={saving}
              >
                Yeni Oyun
              </Button>
            </div>
          </div>
        )}

        {/* Input */}
        {!gameWon && (
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
            
            {searchTerm && filteredCharacters.length === 0 && (
              <p className="text-sm text-gray-500 mt-2">Karakter bulunamadı</p>
            )}
          </div>
        )}

        {/* Guesses */}
        {guesses.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg md:text-xl font-bold text-[#013220] text-center">Tahminler</h2>
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
