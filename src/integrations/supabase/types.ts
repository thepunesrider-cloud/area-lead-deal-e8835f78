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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      community_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_messages: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          message: string
          sender_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          message: string
          sender_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          message?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          claimed_at: string | null
          claimed_by_user_id: string | null
          completed_at: string | null
          created_at: string | null
          created_by_user_id: string
          customer_name: string | null
          customer_phone: string
          id: string
          import_confidence: number | null
          lead_generator_phone: string | null
          location_address: string | null
          location_lat: number
          location_long: number
          notes: string | null
          photo_url: string | null
          proof_url: string | null
          raw_message: string | null
          rejected_at: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          source: string | null
          special_instructions: string | null
          status: Database["public"]["Enums"]["lead_status"] | null
          updated_at: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_user_id: string
          customer_name?: string | null
          customer_phone: string
          id?: string
          import_confidence?: number | null
          lead_generator_phone?: string | null
          location_address?: string | null
          location_lat: number
          location_long: number
          notes?: string | null
          photo_url?: string | null
          proof_url?: string | null
          raw_message?: string | null
          rejected_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          source?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by_user_id?: string
          customer_name?: string | null
          customer_phone?: string
          id?: string
          import_confidence?: number | null
          lead_generator_phone?: string | null
          location_address?: string | null
          location_lat?: number
          location_long?: number
          notes?: string | null
          photo_url?: string | null
          proof_url?: string | null
          raw_message?: string | null
          rejected_at?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          source?: string | null
          special_instructions?: string | null
          status?: Database["public"]["Enums"]["lead_status"] | null
          updated_at?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_claimed_by_user_id_fkey"
            columns: ["claimed_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          gateway_order_id: string | null
          gateway_transaction_id: string | null
          id: string
          metadata: Json | null
          payment_gateway: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          gateway_order_id?: string | null
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          payment_gateway?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          gateway_order_id?: string | null
          gateway_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          payment_gateway?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          is_subscribed: boolean | null
          location_lat: number | null
          location_long: number | null
          name: string
          phone: string | null
          preferred_language: string | null
          service_radius_km: number | null
          service_type: Database["public"]["Enums"]["service_type"] | null
          subscription_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          is_subscribed?: boolean | null
          location_lat?: number | null
          location_long?: number | null
          name?: string
          phone?: string | null
          preferred_language?: string | null
          service_radius_km?: number | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          subscription_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          is_subscribed?: boolean | null
          location_lat?: number | null
          location_long?: number | null
          name?: string
          phone?: string | null
          preferred_language?: string | null
          service_radius_km?: number | null
          service_type?: Database["public"]["Enums"]["service_type"] | null
          subscription_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_tokens: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          token: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          token: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          token?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      lead_status:
        | "open"
        | "claimed"
        | "completed"
        | "cancelled"
        | "rejected"
        | "pending"
      service_type:
        | "rent_agreement"
        | "domicile"
        | "income_certificate"
        | "birth_certificate"
        | "death_certificate"
        | "other"
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
      app_role: ["admin", "moderator", "user"],
      lead_status: [
        "open",
        "claimed",
        "completed",
        "cancelled",
        "rejected",
        "pending",
      ],
      service_type: [
        "rent_agreement",
        "domicile",
        "income_certificate",
        "birth_certificate",
        "death_certificate",
        "other",
      ],
    },
  },
} as const
