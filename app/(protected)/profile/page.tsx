"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gamepad2, Users, Trophy, Target, LogOut, X, CheckCircle2, User } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
}

interface UserStats {
  user_id: string;
  single_games_played: number;
  single_avg_score: number;
  multi_games_played: number;
  multi_games_won: number;
  multi_rounds_won: number;
}

interface Character {
  id: number;
  name: string;
  image_path: string | null;
}

export default function ProfilePage() {
  const { user, signOut } = useAuth();
  const supabase = createClient();
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charactersLoading, setCharactersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [savingAvatar, setSavingAvatar] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [imageLoadings, setImageLoadings] = useState<Set<number>>(new Set());
  const [imageUrls, setImageUrls] = useState<Map<number, string>>(new Map());
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const loadProfile = async () => {
      try {
        setLoading(true);

        // Profil bilgilerini çek
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;
        setProfile(profileData);

        // Avatar için signed URL al
        if (profileData.avatar_url) {
          try {
            const fileName = profileData.avatar_url.startsWith("character-images/")
              ? profileData.avatar_url.replace("character-images/", "")
              : profileData.avatar_url;

            const { data: signedData, error: signedError } = await supabase
              .storage
              .from("character-images")
              .createSignedUrl(fileName, 31536000);

            if (!signedError && signedData) {
              setAvatarSignedUrl(signedData.signedUrl);
            }
          } catch (err) {
            console.error("Failed to get avatar signed URL:", err);
          }
        }

        // İstatistikleri çek
        const { data: statsData, error: statsError } = await supabase
          .from("user_stats")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (statsError) throw statsError;
        setStats(statsData || {
          user_id: user.id,
          single_games_played: 0,
          single_avg_score: 0,
          multi_games_played: 0,
          multi_games_won: 0,
          multi_rounds_won: 0,
        });
      } catch (err: any) {
        console.error("Load profile error:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user, supabase]);

  // Karakterleri yükle (signed URL'ler lazy loading ile alınacak)
  useEffect(() => {
    if (!showAvatarModal) return;

    const loadCharacters = async () => {
      try {
        setCharactersLoading(true);
        const { data, error } = await supabase
          .from("characters")
          .select("id, name, image_path")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (error) throw error;
        
        setCharacters(data || []);
      } catch (err: any) {
        console.error("Load characters error:", err);
      } finally {
        setCharactersLoading(false);
      }
    };

    loadCharacters();
  }, [showAvatarModal, supabase]);

  // Lazy loading: Sadece görünür karakterler için signed URL al
  const loadImageUrl = async (characterId: number, imagePath: string | null) => {
    if (!imagePath || imageUrls.has(characterId)) return;

    try {
      const fileName = imagePath.startsWith("character-images/")
        ? imagePath.replace("character-images/", "")
        : imagePath;

      const { data: signedData, error: signedError } = await supabase
        .storage
        .from("character-images")
        .createSignedUrl(fileName, 31536000);

      if (!signedError && signedData) {
        setImageUrls(prev => new Map(prev).set(characterId, signedData.signedUrl));
      }
    } catch (err) {
      console.error(`Failed to get signed URL for character ${characterId}:`, err);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  // Avatar URL'i oluştur (signed URL kullan)
  const getAvatarUrl = () => {
    return avatarSignedUrl;
  };

  // Karakter resim URL'i al (signed URL'den)
  const getCharacterImageUrl = (characterId: number) => {
    return imageUrls.get(characterId) || null;
  };

  // Karakter seç
  const handleSelectCharacter = async (character: Character) => {
    if (!user || !profile) return;

    try {
      setSavingAvatar(true);
      
      // avatar_url olarak karakterin image_path'ini kaydet
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: character.image_path })
        .eq("id", user.id);

      if (error) throw error;

      // Profili güncelle
      setProfile({
        ...profile,
        avatar_url: character.image_path,
      });

      // Yeni avatar için signed URL al
      if (character.image_path) {
        try {
          const fileName = character.image_path.startsWith("character-images/")
            ? character.image_path.replace("character-images/", "")
            : character.image_path;

          const { data: signedData, error: signedError } = await supabase
            .storage
            .from("character-images")
            .createSignedUrl(fileName, 31536000);

          if (!signedError && signedData) {
            setAvatarSignedUrl(signedData.signedUrl);
          }
        } catch (err) {
          console.error("Failed to get new avatar signed URL:", err);
        }
      }

      setShowAvatarModal(false);
      setSearchQuery("");
    } catch (err: any) {
      console.error("Save avatar error:", err);
      alert("Avatar kaydedilemedi: " + err.message);
    } finally {
      setSavingAvatar(false);
    }
  };

  // Filtrelenmiş karakterler
  const filteredCharacters = characters.filter((char) =>
    char.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Placeholder avatar (ilk harf)
  const getInitials = () => {
    if (profile?.username) {
      return profile.username[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "?";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F2EBE2] flex items-center justify-center px-4 py-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013220] mx-auto"></div>
          <p className="text-[#855E42] font-semibold">Profil yükleniyor...</p>
        </div>
      </div>
    );
  }

  const avatarUrl = getAvatarUrl();
  const winRate = stats && stats.multi_games_played > 0
    ? ((stats.multi_games_won / stats.multi_games_played) * 100).toFixed(1)
    : "0.0";

  return (
    <>
      <div className="min-h-screen bg-[#F2EBE2] px-4 py-6 md:py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-6 md:mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-[#013220] mb-2">Profil</h1>
            <p className="text-[#855E42] font-medium">
              İstatistiklerinizi ve profil bilgilerinizi görüntüleyin
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {/* Profile Card */}
            <Card className="md:col-span-1 bg-white border-2 border-[#013220] rounded-2xl shadow-xl">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4 relative group">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile?.username || "Avatar"}
                      className="w-32 h-32 rounded-full object-cover border-4 border-[#013220] cursor-pointer transition-all hover:opacity-80 hover:scale-105"
                      onClick={() => setShowAvatarModal(true)}
                    />
                  ) : (
                    <div 
                      className="w-32 h-32 rounded-full bg-[#013220] flex items-center justify-center text-[#F2EBE2] text-5xl font-bold border-4 border-[#855E42] cursor-pointer transition-all hover:opacity-80 hover:scale-105"
                      onClick={() => setShowAvatarModal(true)}
                    >
                      {getInitials()}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-[#013220]/70 rounded-full">
                    <span className="text-[#F2EBE2] text-sm font-semibold">Değiştir</span>
                  </div>
                </div>
                <CardTitle className="text-2xl text-[#013220]">
                  {profile?.username || user?.email?.split("@")[0] || "Kullanıcı"}
                </CardTitle>
                <p className="text-sm text-[#855E42] mt-1 font-medium">
                  {user?.email}
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={() => setShowAvatarModal(true)}
                  className="w-full bg-[#F2EBE2] text-[#013220] border-2 border-[#013220] hover:bg-[#013220] hover:text-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl"
                >
                  <User className="w-4 h-4 mr-2" />
                  Avatar Değiştir
                </Button>
                <Button
                  onClick={handleSignOut}
                  className="w-full bg-white text-[#013220] border-2 border-[#855E42] hover:bg-[#855E42] hover:text-[#F2EBE2] transition-all duration-200 font-semibold rounded-xl"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Çıkış Yap
                </Button>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="md:col-span-2 space-y-4 md:space-y-6">
              {/* Single Player Stats */}
              <Card className="bg-white border-2 border-[#013220] rounded-2xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#013220]">
                    <Gamepad2 className="w-6 h-6" />
                    <span>Single Player İstatistikleri</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#013220]/10 rounded-xl border-2 border-[#013220]/20">
                      <p className="text-sm text-[#855E42] mb-1 font-medium">
                        Oynanan Oyun
                      </p>
                      <p className="text-3xl font-bold text-[#013220]">
                        {stats?.single_games_played || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-[#855E42]/10 rounded-xl border-2 border-[#855E42]/20">
                      <p className="text-sm text-[#855E42] mb-1 font-medium">
                        Ortalama Skor
                      </p>
                      <p className="text-3xl font-bold text-[#013220]">
                        {stats?.single_avg_score ? stats.single_avg_score.toFixed(1) : "0.0"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Multiplayer Stats */}
              <Card className="bg-white border-2 border-[#013220] rounded-2xl shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-[#013220]">
                    <Users className="w-6 h-6" />
                    <span>Multiplayer İstatistikleri</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-[#013220]/10 rounded-xl border-2 border-[#013220]/20">
                      <p className="text-sm text-[#855E42] mb-1 font-medium">
                        Oynanan Oyun
                      </p>
                      <p className="text-3xl font-bold text-[#013220]">
                        {stats?.multi_games_played || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-[#855E42]/10 rounded-xl border-2 border-[#855E42]/20">
                      <p className="text-sm text-[#855E42] mb-1 font-medium">
                        Kazanılan Oyun
                      </p>
                      <p className="text-3xl font-bold text-[#013220]">
                        {stats?.multi_games_won || 0}
                      </p>
                    </div>
                    <div className="p-4 bg-[#F2EBE2]/50 rounded-xl border-2 border-[#013220]/20">
                      <p className="text-sm text-[#855E42] mb-1 font-medium">
                        Kazanma Oranı
                      </p>
                      <p className="text-3xl font-bold text-[#013220]">
                        {winRate}%
                      </p>
                    </div>
                    <div className="p-4 bg-[#F2EBE2]/50 rounded-xl border-2 border-[#013220]/20">
                      <p className="text-sm text-[#855E42] mb-1 font-medium">
                        Round Kazanılan
                      </p>
                      <p className="text-3xl font-bold text-[#013220]">
                        {stats?.multi_rounds_won || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Avatar Seçim Modalı */}
      {showAvatarModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-white border-2 border-[#013220] rounded-2xl shadow-xl">
            <CardHeader className="flex-shrink-0 bg-[#F2EBE2] border-b-2 border-[#013220]/20">
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl text-[#013220]">Karakter Seç</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowAvatarModal(false);
                    setSearchQuery("");
                  }}
                  className="text-[#855E42] hover:text-[#013220] hover:bg-[#855E42]/10 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="mt-4">
                <Input
                  placeholder="Karakter ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full border-2 border-[#013220]/20 focus:border-[#013220] rounded-xl text-[#013220]"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {charactersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#013220] mx-auto"></div>
                    <p className="text-[#855E42] font-semibold">Karakterler yükleniyor...</p>
                  </div>
                </div>
              ) : filteredCharacters.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-[#855E42] font-medium">
                    {searchQuery ? "Aradığınız karakter bulunamadı." : "Karakter bulunamadı."}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filteredCharacters.map((character) => {
                    const imageUrl = getCharacterImageUrl(character.id);
                    const isSelected = profile?.avatar_url === character.image_path;
                    const imageError = imageErrors.has(character.id);
                    const imageLoading = imageLoadings.has(character.id);
                    const needsUrl = !imageUrl && !imageError && character.image_path;
                    
                    return (
                      <div
                        key={character.id}
                        ref={(node) => {
                          // Intersection Observer ile lazy loading
                          if (node && needsUrl) {
                            const observer = new IntersectionObserver(
                              (entries) => {
                                entries.forEach((entry) => {
                                  if (entry.isIntersecting) {
                                    loadImageUrl(character.id, character.image_path);
                                    observer.disconnect();
                                  }
                                });
                              },
                              { rootMargin: "50px" } // 50px önceden yükle
                            );
                            observer.observe(node);
                          }
                        }}
                        className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                          isSelected
                            ? "border-[#013220] ring-2 ring-[#013220]/50"
                            : "border-[#013220]/20 hover:border-[#013220]"
                        }`}
                        onClick={() => !savingAvatar && handleSelectCharacter(character)}
                      >
                        {imageUrl && !imageError ? (
                          <>
                            {imageLoading && (
                              <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 flex items-center justify-center z-10">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              </div>
                            )}
                            <img
                              src={imageUrl}
                              alt={character.name}
                              className={`w-full aspect-square object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
                              onLoad={() => {
                                setImageLoadings(prev => {
                                  const next = new Set(prev);
                                  next.delete(character.id);
                                  return next;
                                });
                              }}
                              onError={(e) => {
                                setImageErrors(prev => new Set(prev).add(character.id));
                                setImageLoadings(prev => {
                                  const next = new Set(prev);
                                  next.delete(character.id);
                                  return next;
                                });
                              }}
                              onLoadStart={() => {
                                setImageLoadings(prev => new Set(prev).add(character.id));
                              }}
                            />
                          </>
                        ) : (
                          <div className="w-full aspect-square bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center p-2">
                            {needsUrl ? (
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            ) : (
                              <>
                                <span className="text-gray-400 text-xs text-center">
                                  {imageError ? "Yüklenemedi" : "No Image"}
                                </span>
                                <span className="text-gray-500 text-xs mt-1 text-center truncate w-full">
                                  {character.name}
                                </span>
                              </>
                            )}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <span className="text-white text-sm font-semibold text-center px-2">
                            {character.name}
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-[#013220] text-[#F2EBE2] rounded-full w-6 h-6 flex items-center justify-center z-10">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
