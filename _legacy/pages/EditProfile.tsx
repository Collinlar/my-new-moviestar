import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { Upload, Loader2, User, Globe, Heart, Settings } from "lucide-react";

const EditProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    display_name: "",
    bio: "",
    avatar_url: "",
    preferred_genres: [] as string[],
    preferred_languages: [] as string[],
    notification_preferences: {
      email_notifications: true,
      review_mentions: true,
      new_movie_alerts: false
    }
  });
  
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch current profile data
  const { data: profile, isLoading } = useQuery({
    queryKey: ["current-profile"],
    queryFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Update form when profile data loads
  React.useEffect(() => {
    if (profile) {
      setFormData({
        display_name: profile.display_name || "",
        bio: profile.bio || "",
        avatar_url: profile.avatar_url || "",
        preferred_genres: profile.preferred_genres || [],
        preferred_languages: profile.preferred_languages || [],
        notification_preferences: (profile.notification_preferences as any) || {
          email_notifications: true,
          review_mentions: true,
          new_movie_alerts: false
        }
      });
    }
  }, [profile]);

  // Validation function
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.display_name.trim()) {
      newErrors.display_name = "Display name is required";
    } else if (formData.display_name.length < 2) {
      newErrors.display_name = "Display name must be at least 2 characters";
    } else if (formData.display_name.length > 50) {
      newErrors.display_name = "Display name must be less than 50 characters";
    }
    
    if (formData.bio && formData.bio.length > 500) {
      newErrors.bio = "Bio must be less than 500 characters";
    }
    
    if (formData.avatar_url && !isValidUrl(formData.avatar_url)) {
      newErrors.avatar_url = "Please enter a valid URL";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (string: string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  };

  // Handle file upload (for future implementation with Supabase Storage)
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      // For now, we'll use a placeholder service
      // In production, you'd upload to Supabase Storage
      const fakeUploadUrl = `https://via.placeholder.com/300x300/6366f1/ffffff?text=${encodeURIComponent(file.name)}`;
      
      setFormData(prev => ({ ...prev, avatar_url: fakeUploadUrl }));
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been updated",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: any) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["current-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      navigate(`/profile/${user?.id}`);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const updates = {
      display_name: formData.display_name.trim(),
      bio: formData.bio.trim() || null,
      avatar_url: formData.avatar_url || null,
      preferred_genres: formData.preferred_genres,
      preferred_languages: formData.preferred_languages,
      notification_preferences: formData.notification_preferences,
      updated_at: new Date().toISOString()
    };

    updateProfileMutation.mutate(updates);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: checked 
        ? [...prev[field as keyof typeof prev] as string[], value]
        : (prev[field as keyof typeof prev] as string[]).filter(item => item !== value)
    }));
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold text-muted-foreground">Authentication Required</h2>
              <p className="mt-2 text-muted-foreground">Please sign in to edit your profile.</p>
              <Button className="mt-4" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-8" />
            <div className="h-64 bg-muted rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Profile Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">Edit Profile</h1>
            <p className="text-muted-foreground">Customize your profile and preferences</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={formData.avatar_url || undefined} />
                      <AvatarFallback className="text-3xl">
                        {formData.display_name?.charAt(0).toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 w-8 rounded-full p-0"
                        onClick={() => document.getElementById('avatar-upload')?.click()}
                        disabled={isUploading}
                      >
                        {isUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div>
                      <Label htmlFor="avatar_url">Avatar URL</Label>
                      <Input
                        id="avatar_url"
                        type="url"
                        value={formData.avatar_url}
                        onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className={errors.avatar_url ? "border-red-500" : ""}
                      />
                      {errors.avatar_url && (
                        <p className="text-sm text-red-500 mt-1">{errors.avatar_url}</p>
                      )}
                    </div>
                    
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                    />
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => handleInputChange('display_name', e.target.value)}
                    placeholder="Enter your display name"
                    className={errors.display_name ? "border-red-500" : ""}
                  />
                  {errors.display_name && (
                    <p className="text-sm text-red-500 mt-1">{errors.display_name}</p>
                  )}
                </div>

                {/* Bio */}
                <div>
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Tell us about yourself..."
                    rows={4}
                    maxLength={500}
                    className={errors.bio ? "border-red-500" : ""}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.bio && (
                      <p className="text-sm text-red-500">{errors.bio}</p>
                    )}
                    <p className="text-sm text-muted-foreground ml-auto">
                      {formData.bio.length}/500
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Movie Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preferred Genres */}
                <div>
                  <Label>Preferred Genres</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {['action', 'comedy', 'drama', 'romance', 'thriller', 'horror', 'adventure', 'family', 'documentary', 'musical', 'historical'].map((genre) => (
                      <label key={genre} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.preferred_genres.includes(genre)}
                          onChange={(e) => handleArrayChange('preferred_genres', genre, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm capitalize">{genre}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preferred Languages */}
                <div>
                  <Label>Preferred Languages</Label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-2">
                    {['english', 'yoruba', 'igbo', 'hausa', 'twi', 'french', 'swahili', 'other'].map((language) => (
                      <label key={language} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={formData.preferred_languages.includes(language)}
                          onChange={(e) => handleArrayChange('preferred_languages', language, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm capitalize">{language}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.notification_preferences.email_notifications}
                    onChange={(e) => handleInputChange('notification_preferences', {
                      ...formData.notification_preferences,
                      email_notifications: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span>Email notifications</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.notification_preferences.review_mentions}
                    onChange={(e) => handleInputChange('notification_preferences', {
                      ...formData.notification_preferences,
                      review_mentions: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span>Review mentions and replies</span>
                </label>
                
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.notification_preferences.new_movie_alerts}
                    onChange={(e) => handleInputChange('notification_preferences', {
                      ...formData.notification_preferences,
                      new_movie_alerts: e.target.checked
                    })}
                    className="rounded border-gray-300"
                  />
                  <span>New movie alerts</span>
                </label>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="min-w-[120px]"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditProfile;