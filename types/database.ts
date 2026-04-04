export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string;
          title: string | null;
          tagline: string | null;
          division: string;
          ovr: number;
          wins: number;
          podiums: number;
          streak: number;
          rating: number;
          badges: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          title?: string | null;
          tagline?: string | null;
          division?: string;
          ovr?: number;
          wins?: number;
          podiums?: number;
          streak?: number;
          rating?: number;
          badges?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      avatars: {
        Row: {
          id: string;
          profile_id: string;
          avatar_name: string;
          color_theme: string;
          tail_type: string;
          aura_effect: string;
          headgear: string;
          face_extra: string;
          neck_wear: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          avatar_name: string;
          color_theme: string;
          tail_type: string;
          aura_effect: string;
          headgear?: string;
          face_extra?: string;
          neck_wear?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["avatars"]["Insert"]>;
        Relationships: [];
      };
      presence_rooms: {
        Row: {
          id: string;
          room_slug: string;
          profile_id: string;
          pos_x: number;
          pos_y: number;
          in_queue: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          room_slug: string;
          profile_id: string;
          pos_x?: number;
          pos_y?: number;
          in_queue?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["presence_rooms"]["Insert"]>;
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          room_slug: string;
          profile_id: string;
          recipient_profile_id: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          room_slug: string;
          profile_id: string;
          recipient_profile_id?: string | null;
          body: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["chat_messages"]["Insert"]>;
        Relationships: [];
      };
      race_rooms: {
        Row: {
          id: string;
          status: string;
          seed: number;
          started_at: string | null;
          ended_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          status?: string;
          seed: number;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["race_rooms"]["Insert"]>;
        Relationships: [];
      };
      race_entries: {
        Row: {
          id: string;
          race_room_id: string;
          profile_id: string;
          place: number | null;
          score: number;
          stats: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          race_room_id: string;
          profile_id: string;
          place?: number | null;
          score?: number;
          stats?: Json;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["race_entries"]["Insert"]>;
        Relationships: [];
      };
      leaderboard_snapshots: {
        Row: {
          id: string;
          period: string;
          profile_id: string;
          wins: number;
          podiums: number;
          streak: number;
          rating: number;
          rank: number;
          computed_at: string;
        };
        Insert: {
          id?: string;
          period: string;
          profile_id: string;
          wins: number;
          podiums: number;
          streak: number;
          rating: number;
          rank: number;
          computed_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["leaderboard_snapshots"]["Insert"]>;
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          target_profile_id: string | null;
          message_id: string | null;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          target_profile_id?: string | null;
          message_id?: string | null;
          reason: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["reports"]["Insert"]>;
        Relationships: [];
      };
      user_settings: {
        Row: {
          profile_id: string;
          muted_profile_ids: string[];
          blocked_profile_ids: string[];
          settings: Json;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          muted_profile_ids?: string[];
          blocked_profile_ids?: string[];
          settings?: Json;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_settings"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      ovum_try_start_race: {
        Args: { p_room: string };
        Returns: string | null;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
