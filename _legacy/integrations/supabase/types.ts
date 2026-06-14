export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      creators: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      helpful_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_awards: {
        Row: {
          category: string
          created_at: string
          id: string
          movie_id: string
          name: string
          won: boolean
          year: number
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          movie_id: string
          name: string
          won?: boolean
          year: number
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          movie_id?: string
          name?: string
          won?: boolean
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "movie_awards_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_cast: {
        Row: {
          character: string | null
          created_at: string
          id: string
          movie_id: string
          name: string
          role: string
        }
        Insert: {
          character?: string | null
          created_at?: string
          id?: string
          movie_id: string
          name: string
          role: string
        }
        Update: {
          character?: string | null
          created_at?: string
          id?: string
          movie_id?: string
          name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_cast_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_crew: {
        Row: {
          created_at: string
          department: string
          id: string
          movie_id: string
          name: string
          role: string
        }
        Insert: {
          created_at?: string
          department: string
          id?: string
          movie_id: string
          name: string
          role: string
        }
        Update: {
          created_at?: string
          department?: string
          id?: string
          movie_id?: string
          name?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_crew_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_people: {
        Row: {
          billing_order: number | null
          character_name: string | null
          created_at: string
          department: string | null
          id: string
          movie_id: string
          person_id: string
          role: Database["public"]["Enums"]["person_role"]
        }
        Insert: {
          billing_order?: number | null
          character_name?: string | null
          created_at?: string
          department?: string | null
          id?: string
          movie_id: string
          person_id: string
          role: Database["public"]["Enums"]["person_role"]
        }
        Update: {
          billing_order?: number | null
          character_name?: string | null
          created_at?: string
          department?: string | null
          id?: string
          movie_id?: string
          person_id?: string
          role?: Database["public"]["Enums"]["person_role"]
        }
        Relationships: [
          {
            foreignKeyName: "movie_people_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_people_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_related: {
        Row: {
          created_at: string
          id: string
          movie_id: string
          related_movie_id: string
          relationship_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          movie_id: string
          related_movie_id: string
          relationship_type: string
        }
        Update: {
          created_at?: string
          id?: string
          movie_id?: string
          related_movie_id?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_related_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movie_related_related_movie_id_fkey"
            columns: ["related_movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movie_trailers: {
        Row: {
          created_at: string
          id: string
          movie_id: string
          title: string
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          movie_id: string
          title: string
          type: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          movie_id?: string
          title?: string
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "movie_trailers_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      movies: {
        Row: {
          average_rating: number | null
          box_office: number | null
          budget: number | null
          content_warning: string | null
          country: string | null
          created_at: string
          created_source: Database["public"]["Enums"]["created_source"] | null
          creator_id: string | null
          cultural_context: string | null
          description: string | null
          director: string | null
          distribution_status:
            | Database["public"]["Enums"]["distribution_status"]
            | null
          duration: number | null
          editor_note: string | null
          featured: boolean | null
          festivals: string | null
          genre: Database["public"]["Enums"]["movie_genre"]
          id: string
          is_featured: boolean | null
          is_streaming_available: boolean | null
          keywords: string | null
          language: Database["public"]["Enums"]["movie_language"]
          original_title: string | null
          poster_url: string | null
          producer: string | null
          production_company: string | null
          rating: string | null
          release_year: number
          review_count: number | null
          synopsis: string | null
          tagline: string | null
          title: string
          updated_at: string
          writer: string | null
          youtube_url: string
        }
        Insert: {
          average_rating?: number | null
          box_office?: number | null
          budget?: number | null
          content_warning?: string | null
          country?: string | null
          created_at?: string
          created_source?: Database["public"]["Enums"]["created_source"] | null
          creator_id?: string | null
          cultural_context?: string | null
          description?: string | null
          director?: string | null
          distribution_status?:
            | Database["public"]["Enums"]["distribution_status"]
            | null
          duration?: number | null
          editor_note?: string | null
          featured?: boolean | null
          festivals?: string | null
          genre: Database["public"]["Enums"]["movie_genre"]
          id?: string
          is_featured?: boolean | null
          is_streaming_available?: boolean | null
          keywords?: string | null
          language?: Database["public"]["Enums"]["movie_language"]
          original_title?: string | null
          poster_url?: string | null
          producer?: string | null
          production_company?: string | null
          rating?: string | null
          release_year: number
          review_count?: number | null
          synopsis?: string | null
          tagline?: string | null
          title: string
          updated_at?: string
          writer?: string | null
          youtube_url: string
        }
        Update: {
          average_rating?: number | null
          box_office?: number | null
          budget?: number | null
          content_warning?: string | null
          country?: string | null
          created_at?: string
          created_source?: Database["public"]["Enums"]["created_source"] | null
          creator_id?: string | null
          cultural_context?: string | null
          description?: string | null
          director?: string | null
          distribution_status?:
            | Database["public"]["Enums"]["distribution_status"]
            | null
          duration?: number | null
          editor_note?: string | null
          featured?: boolean | null
          festivals?: string | null
          genre?: Database["public"]["Enums"]["movie_genre"]
          id?: string
          is_featured?: boolean | null
          is_streaming_available?: boolean | null
          keywords?: string | null
          language?: Database["public"]["Enums"]["movie_language"]
          original_title?: string | null
          poster_url?: string | null
          producer?: string | null
          production_company?: string | null
          rating?: string | null
          release_year?: number
          review_count?: number | null
          synopsis?: string | null
          tagline?: string | null
          title?: string
          updated_at?: string
          writer?: string | null
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "movies_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          bio: string | null
          country: string | null
          created_at: string
          date_of_birth: string | null
          date_of_death: string | null
          full_name: string
          id: string
          imdb_id: string | null
          profile_image: string | null
          updated_at: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          bio?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_death?: string | null
          full_name: string
          id?: string
          imdb_id?: string | null
          profile_image?: string | null
          updated_at?: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          bio?: string | null
          country?: string | null
          created_at?: string
          date_of_birth?: string | null
          date_of_death?: string | null
          full_name?: string
          id?: string
          imdb_id?: string | null
          profile_image?: string | null
          updated_at?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          is_suspended: boolean | null
          notification_preferences: Json | null
          preferred_genres: string[] | null
          preferred_languages: string[] | null
          role: string | null
          suspension_reason: string | null
          suspension_until: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_suspended?: boolean | null
          notification_preferences?: Json | null
          preferred_genres?: string[] | null
          preferred_languages?: string[] | null
          role?: string | null
          suspension_reason?: string | null
          suspension_until?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          is_suspended?: boolean | null
          notification_preferences?: Json | null
          preferred_genres?: string[] | null
          preferred_languages?: string[] | null
          role?: string | null
          suspension_reason?: string | null
          suspension_until?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      review_flags: {
        Row: {
          created_at: string
          details: string | null
          id: string
          reason: string
          review_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          review_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          review_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_flags_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment_count: number | null
          created_at: string
          cultural_rating: number | null
          flag_count: number | null
          flagged_reason: string | null
          helpful_count: number | null
          id: string
          moderated_at: string | null
          moderated_by: string | null
          movie_id: string
          production_rating: number | null
          rating: number
          review_text: string | null
          review_type: Database["public"]["Enums"]["review_type"] | null
          rewatch_rating: number | null
          status: string | null
          story_rating: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          comment_count?: number | null
          created_at?: string
          cultural_rating?: number | null
          flag_count?: number | null
          flagged_reason?: string | null
          helpful_count?: number | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          movie_id: string
          production_rating?: number | null
          rating: number
          review_text?: string | null
          review_type?: Database["public"]["Enums"]["review_type"] | null
          rewatch_rating?: number | null
          status?: string | null
          story_rating?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          comment_count?: number | null
          created_at?: string
          cultural_rating?: number | null
          flag_count?: number | null
          flagged_reason?: string | null
          helpful_count?: number | null
          id?: string
          moderated_at?: string | null
          moderated_by?: string | null
          movie_id?: string
          production_rating?: number | null
          rating?: number
          review_text?: string | null
          review_type?: Database["public"]["Enums"]["review_type"] | null
          rewatch_rating?: number | null
          status?: string | null
          story_rating?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_moderated_by_fkey"
            columns: ["moderated_by"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "reviews_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      watchlists: {
        Row: {
          added_at: string
          id: string
          is_favorite: boolean
          movie_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          is_favorite?: boolean
          movie_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          id?: string
          is_favorite?: boolean
          movie_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "watchlists_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: false
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "watchlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "watchlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          display_name: string | null
          id: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_trending_movies: {
        Args: never
        Returns: {
          average_rating: number
          created_at: string
          creator_id: string
          description: string
          duration: number
          genre: Database["public"]["Enums"]["movie_genre"]
          id: string
          language: Database["public"]["Enums"]["movie_language"]
          poster_url: string
          release_year: number
          review_count: number
          title: string
          updated_at: string
          youtube_url: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      created_source: "admin" | "user_submission" | "partner"
      distribution_status: "cinema" | "streaming" | "dvd" | "tv" | "unavailable"
      movie_genre:
        | "action"
        | "comedy"
        | "drama"
        | "romance"
        | "thriller"
        | "horror"
        | "adventure"
        | "family"
        | "documentary"
        | "musical"
        | "historical"
      movie_language:
        | "english"
        | "yoruba"
        | "igbo"
        | "hausa"
        | "twi"
        | "french"
        | "swahili"
        | "other"
      person_role:
        | "actor"
        | "director"
        | "writer"
        | "producer"
        | "cinematographer"
        | "editor"
        | "composer"
        | "costume_designer"
        | "production_designer"
      review_type: "audience" | "critic"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      created_source: ["admin", "user_submission", "partner"],
      distribution_status: ["cinema", "streaming", "dvd", "tv", "unavailable"],
      movie_genre: [
        "action",
        "comedy",
        "drama",
        "romance",
        "thriller",
        "horror",
        "adventure",
        "family",
        "documentary",
        "musical",
        "historical",
      ],
      movie_language: [
        "english",
        "yoruba",
        "igbo",
        "hausa",
        "twi",
        "french",
        "swahili",
        "other",
      ],
      person_role: [
        "actor",
        "director",
        "writer",
        "producer",
        "cinematographer",
        "editor",
        "composer",
        "costume_designer",
        "production_designer",
      ],
      review_type: ["audience", "critic"],
    },
  },
} as const
